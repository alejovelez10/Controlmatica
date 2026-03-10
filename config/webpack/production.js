process.env.NODE_ENV = process.env.NODE_ENV || 'production'

const environment = require('./environment')

// Fix: Terser convierte var→const en sweetalert2 causando
// "Assignment to constant variable" en producción
const config = environment.toWebpackConfig()

if (config.optimization && config.optimization.minimizer) {
  config.optimization.minimizer.forEach(function(plugin) {
    if (plugin.constructor.name === 'TerserPlugin' || (plugin.options && plugin.options.terserOptions)) {
      var opts = plugin.options || {}
      var terserOpts = opts.terserOptions || {}
      terserOpts.compress = Object.assign({}, terserOpts.compress, {
        reduce_vars: false,
        collapse_vars: false
      })
      if (plugin.options) {
        plugin.options.terserOptions = terserOpts
      }
    }
  })
}

module.exports = config
