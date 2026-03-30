// Script de arranque para preview: cambia al directorio correcto y lanza next dev
process.chdir('/Users/macbookair/Downloads/financepro-chile');
require('./node_modules/.bin/../next/dist/bin/next');
process.argv = ['node', 'next', 'dev', '--port', '3000'];
