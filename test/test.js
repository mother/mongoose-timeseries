var mongoose = require('mongoose')
var mockgoose = require('mockgoose')
var assert = require('chai').assert

before(function (done) {
  mockgoose(mongoose).then(function () {
    mongoose.connect('mongodb://example.com/TestingDB', function (err) {
      done(err)
    })
  })
})

describe('mongoose-timeseries', function () {
  it('1', function () {
    assert.equal(1, 1)
  })
  it('2', function () {
    assert.equal(2, 2)
  })
})
