const { environment } = require('@rails/webpacker')

// SweetAlert2 v11+ usa ES6 (const, let, arrow functions)
// pero UglifyJS 2.x (de Webpacker 3.5) solo soporta ES5.
// Forzamos que Babel transpile sweetalert2 a ES5.
const babelLoader = environment.loaders.get('babel')
if (babelLoader) {
  babelLoader.exclude = function(modulePath) {
    // No excluir sweetalert2 de Babel (transpilarlo)
    if (/node_modules\/sweetalert2/.test(modulePath)) return false
    // Excluir el resto de node_modules como siempre
    return /node_modules/.test(modulePath)
  }
}

module.exports = environment
