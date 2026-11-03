"""Read a supplied workbook without modifying it; generate the website catalogue."""
import argparse
import copy
import hashlib
import json
import math
import re
import subprocess
import unicodedata
from collections import Counter
from pathlib import Path
from urllib.parse import urlsplit

import openpyxl


def norm(value):
    text = unicodedata.normalize('NFKD', str(value or ''))
    return re.sub(r'[^a-z0-9]', '', text.encode('ascii', 'ignore').decode().lower())


def numeric(value):
    return value if isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) else None


def generation_code(url):
    parts = urlsplit(url or '').path.strip('/').split('/')
    try:
        return parts[parts.index('1-vehiculos') + 3].split('-')[0]
    except (ValueError, IndexError):
        return None


def engine_key(engine):
    name = re.sub(r'\([^)]*(?:19|20)\d{2}[^)]*\)', '', engine[1])
    return norm(engine[0]), norm(name), engine[2]


def import_catalog(source, existing):
    workbook = openpyxl.load_workbook(source, read_only=True, data_only=True)
    legacy = existing['generations']
    groups, used_legacy, engine_sources, claimed_legacy = {}, set(), {}, {}
    report = {'sourceFile': source.name, 'rows': 0, 'brands': [], 'missingFuel': [], 'conflicts': [], 'duplicates': 0, 'unpublishedPower': 0, 'unpublishedTorque': 0, 'gainDifferences': [], 'invalidRows': []}
    fuels = {'Diésel': 'Diesel', 'Eléctrico': 'Eléctrico', 'Petrol Hybrid': 'Gasolina híbrida', 'Petrol Micro Hybrid': 'Gasolina microhíbrida', 'Petrol Micro Hybrid 48V': 'Gasolina microhíbrida 48V', 'Diesel Hybrid': 'Diésel híbrido', 'Diesel Micro Hybrid': 'Diésel microhíbrido', 'Diesel Micro Hybrid 48V': 'Diésel microhíbrido 48V', 'Hydrogen': 'Hidrógeno', 'Multifuel Essence / E85': 'Gasolina / E85'}
    for sheet in workbook:
        if sheet.max_column != 13:
            continue
        report['brands'].append(sheet.title)
        for row_number, row in enumerate(sheet.values, 1):
            if row_number <= 5 or not row[0]:
                continue
            report['rows'] += 1
            model, period, motor, fuel, stage, stock_power, stock_torque, power, torque, power_gain, torque_gain, notes, url = row
            position = {'sheet': sheet.title, 'row': row_number}
            if not model or not period or not motor or not numeric(stock_power) or stock_power <= 0 or not re.fullmatch(r'Stage [1-4]', str(stage)) or urlsplit(str(url)).scheme != 'https':
                report['invalidRows'].append(position)
                continue
            fuel = fuels.get(fuel, fuel) or 'No especificado'
            if fuel == 'No especificado':
                report['missingFuel'].append(position)
            years = re.findall(r'\b(?:19|20)\d{2}\b', period)
            start, end = (int(years[0]) if years else None), (int(years[-1]) if len(years) > 1 else None)
            code = generation_code(url)
            make = sheet.title.lower()
            key = (norm(make), norm(model), str(period))
            if key not in groups:
                candidates = [g for g in legacy if norm(g['make']) == norm(make) and norm(g['model']) == norm(model) and ((code and generation_code(g.get('sourceUrl')) == code) or (g.get('from') == start and g.get('to') == end)) and g['id'] not in used_legacy]
                old = candidates[0] if len(candidates) == 1 else None
                if old:
                    g = copy.deepcopy(old)
                    used_legacy.add(g['id'])
                else:
                    digest = hashlib.sha256('|'.join(key).encode()).hexdigest()[:16]
                    g = {'id': 'catalog-' + digest, 'make': make, 'model': model, 'name': model, 'period': str(period), 'from': start, 'to': end, 'engines': []}
                g.update({'makeLabel': sheet.title, 'sourceUrl': str(url).rsplit('/', 2)[0] + '/', 'sourceFile': source.name, 'sourceSheet': sheet.title, 'stages': {}, 'references': g.get('references', {})})
                groups[key] = g
                engine_sources[key] = {}
                claimed_legacy[key] = set()
            g = groups[key]
            engine = [fuel, str(motor), stock_power]
            source_engine = (urlsplit(str(url)).path.rstrip('/'), fuel, stock_power)
            index = engine_sources[key].get(source_engine)
            if index is None:
                index = next((i for i, item in enumerate(g['engines']) if i not in claimed_legacy[key] and engine_key(item) == engine_key(engine)), None)
                if index is not None:
                    claimed_legacy[key].add(index)
            if index is None:
                index = len(g['engines'])
                g['engines'].append(engine)
                claimed_legacy[key].add(index)
            engine_sources[key][source_engine] = index
            reference = {'source': 'BR-Performance', 'stage': stage, 'stockPower': stock_power, 'referencePower': numeric(power), 'stockTorque': numeric(stock_torque), 'referenceTorque': numeric(torque), 'sourceUrl': str(url), 'notes': str(notes or ''), 'sourceSheet': sheet.title, 'sourceRow': row_number}
            report['unpublishedPower'] += reference['referencePower'] is None
            report['unpublishedTorque'] += reference['referenceTorque'] is None
            for label, original, modified, gain in [('CV', stock_power, numeric(power), numeric(power_gain)), ('Nm', numeric(stock_torque), numeric(torque), numeric(torque_gain))]:
                if original is not None and modified is not None and gain is not None and abs(modified - original - gain) > 0.01:
                    report['gainDifferences'].append({**position, 'unit': label})
            entries = g['stages'].setdefault(str(index), [])
            if any(ref['stage'] == stage for ref in entries):
                previous = next(ref for ref in entries if ref['stage'] == stage)
                if any(previous.get(k) != reference.get(k) for k in ('referencePower', 'referenceTorque', 'stockTorque')):
                    report['conflicts'].append({**position, 'reason': 'Different figures for same engine/stage; preserved first entry'})
                else:
                    report['duplicates'] += 1
                continue
            if stage == 'Stage 1' and str(index) in g['references']:
                previous = g['references'][str(index)]
                if any(previous.get(k) != reference.get(k) for k in ('stockPower', 'referencePower', 'stockTorque', 'referenceTorque')):
                    report['conflicts'].append({**position, 'reason': 'Previous screenshot reference preserved', 'generationId': g['id'], 'engineIndex': index})
                    reference = {**reference, **previous}
            entries.append(reference)
            if stage == 'Stage 1':
                g['references'][str(index)] = reference
    workbook.close()
    result = list(groups.values()) + [g for g in legacy if g['id'] not in used_legacy]
    result.sort(key=lambda g: (g.get('makeLabel', g['make']).casefold(), g['model'].casefold(), g.get('from') or 0, g['period']))
    for g in result:
        for entries in g.get('stages', {}).values():
            entries.sort(key=lambda ref: ref['stage'])
    report.update({'generations': len(result), 'models': len({(g['make'], g['model']) for g in result}), 'engines': sum(len(g['engines']) for g in result), 'preservedLegacyGenerations': len(legacy) - len(used_legacy)})
    return {'checkedAt': '2026-11-02', 'coverage': 'provided-workbook', 'source': 'User supplied workbook / BR-Performance references', 'sourceFile': source.name, 'generations': result}, report


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('workbook', type=Path)
    parser.add_argument('--catalog', type=Path, default=Path('outputs/vehicle-generations.json'))
    parser.add_argument('--report', type=Path, default=Path('work/catalog-import-report.json'))
    parser.add_argument('--baseline-ref', help='Optional read-only Git reference for the catalogue before this import')
    args = parser.parse_args()
    current = json.loads(subprocess.check_output(['git', 'show', args.baseline_ref + ':' + args.catalog.as_posix()]).decode('utf-8')) if args.baseline_ref else json.loads(args.catalog.read_text(encoding='utf-8'))
    catalog, report = import_catalog(args.workbook, current)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    if report['invalidRows']:
        raise SystemExit('Invalid rows: catalogue unchanged; inspect report')
    args.catalog.write_text(json.dumps(catalog, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    # Browser loads only the selected brand rather than the entire catalogue.
    public_dir = args.catalog.parent / 'vehicle-catalog'
    public_dir.mkdir(exist_ok=True)
    brands = []
    for make in sorted({g['make'] for g in catalog['generations']}):
        entries = [g for g in catalog['generations'] if g['make'] == make]
        filename = norm(make) + '-' + hashlib.sha256(make.encode()).hexdigest()[:8] + '.json'
        (public_dir / filename).write_text(json.dumps({'generations': entries}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        brands.append({'value': make, 'label': entries[0].get('makeLabel', make.upper()), 'url': '/vehicle-catalog/' + filename, 'models': len({g['model'] for g in entries})})
    (public_dir / 'index.json').write_text(json.dumps({'checkedAt': catalog['checkedAt'], 'brands': brands, 'sourceFile': args.workbook.name}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    subprocess.run(['node', str(Path(__file__).with_name('remove-public-catalog-links.cjs'))], check=True)
    print(json.dumps({k: len(v) if isinstance(v, list) else v for k, v in report.items()}, ensure_ascii=True))
