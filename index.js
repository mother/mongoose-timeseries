var mongoose = require('mongoose')
var Schema = mongoose.Schema

var TimeSeriesSchema = new Schema({
  date: {
    start: { type: Date, index: true },
    end: { type: Date, index: true }
  },
  resolution: { type: String, enum: ['minute', 'hour', 'day', 'month'], required: true },
  count: { type: Number },
  key: {},
  data: {}
})

module.exports = exports = function timeSeriesPlugin (schema, options) {
  // Error checking
  if (typeof options === 'undefined' || !options) {
    throw new Error('you must specify the timeseries plugin options object')
  }
  if (!options.target) {
    throw new Error('you must specify the timeseries plugin options attribute "target"')
  } else if (!options.resolutions) {
    throw new Error('you must specify the timeseries plugin options attribute "resolutions"')
  } else if (!options.key) {
    throw new Error('you must specify the timeseries plugin options attribute "key"')
  }

  // New model target for every plugin usage
  var TimeSeriesModel = mongoose.model(options.target, TimeSeriesSchema)

  schema.post('save', function () {
    var document = this

    var documentDate = document._id.getTimestamp()
    if (options.dateField) {
      documentDate = document[options.dateField]
    }

    var timestamps = {}
    for (var i = 0; i < options.resolutions.length; i++) {
      var resolution = options.resolutions[i]
      switch (resolution) {
        case 'minute':
          timestamps[resolution] = new Date(
            documentDate.getFullYear(),
            documentDate.getMonth(),
            documentDate.getDate(),
            documentDate.getHours(),
            documentDate.getMinutes()
          )
          break
        case 'hour':
          timestamps[resolution] = new Date(
            documentDate.getFullYear(),
            documentDate.getMonth(),
            documentDate.getDate(),
            documentDate.getHours()
          )
          break
        case 'day':
          timestamps[resolution] = new Date(
            documentDate.getFullYear(),
            documentDate.getMonth(),
            documentDate.getDate()
          )
          break
        case 'month':
          timestamps[resolution] = new Date(
            documentDate.getFullYear(),
            documentDate.getMonth()
          )
          break
      }
    }

    var key = {}
    var keyNames = Object.keys(options.key)
    var keyObject = options.key
    for (i = 0; i < keyNames.length; i++) {
      var keyName = keyNames[i]
      var keyValue = keyObject[keyName]
      if (typeof keyValue === 'function') {
        key[keyName] = keyValue(document)
      } else if (keyValue === 1) {
        key[keyName] = document[keyName]
      } else {
        throw new Error('invalid timeseries plugin option key value (must be 1 or function)')
      }
    }

    var inc = {}
    // count document itself before custom operations
    inc['count'] = 1

    if (options.data) {
      var dataNames = Object.keys(options.data)
      var dataObject = options.data
      for (i = 0; i < dataNames.length; i++) {
        var dataName = dataNames[i]
        var dataValue = dataObject[dataName]
        var keyBase = 'data.' + dataName
        if (dataValue.operation === 'sum') {
          if (has(document, dataValue.source)) {
            inc[keyBase + '.sum'] = get(document, dataValue.source)
            inc[keyBase + '.count'] = 1
          }
        }
      }
    }

    for (i = 0; i < options.resolutions.length; i++) {
      resolution = options.resolutions[i]

      var findBy = {
        'date.start': timestamps[resolution],
        resolution: resolution,
        key: key
      }

      var set = {
        'date.end': new Date()
      }

      // Upsert resolution
      TimeSeriesModel.findOneAndUpdate(findBy, {
        $inc: inc,
        $set: set
      }, { upsert: true, new: true }, function (err, datapoint) {
        if (err) console.log(err)
      })
    }
  })
}

function get (obj, key) {
  return key.split('.').reduce(function (o, x) {
    return (typeof o === 'undefined' || o === null) ? o : o[x]
  }, obj)
}

function has (obj, key) {
  return key.split('.').every(function (x) {
    if (typeof obj !== 'object' || obj === null || !(x in obj)) {
      return false
    }
    obj = obj[x]
    return true
  })
}
