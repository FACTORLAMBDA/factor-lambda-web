function databaseHeaders(key) {
  if(typeof key!=='string'||!key||key.startsWith('sb_publishable_')){
    const error=new Error('Configura una clave privada de Supabase en el servidor.');error.status=503;throw error;
  }
  // Modern secret keys are opaque API keys, not JWT bearer tokens.
  return {apikey:key,...(key.startsWith('sb_secret_')?{}:{Authorization:'Bearer '+key})};
}
module.exports={databaseHeaders};
