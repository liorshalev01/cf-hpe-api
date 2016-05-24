'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.HpeApiTestResult = undefined;

var _immutable = require('immutable');

var HpeApiTestResult = exports.HpeApiTestResult = (0, _immutable.Record)({
  name: null,
  started: null,
  duration: null,
  status: null,
  package: null,
  module: null,
  class: null
}); /* eslint-disable new-cap */


HpeApiTestResult.create = function (name, started, duration, status, package_, module, class_) {
  return new HpeApiTestResult({
    name: name,
    started: started,
    duration: duration,
    status: status,
    package: package_,
    module: module,
    class: class_
  });
};