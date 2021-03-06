'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.HpeApiBuildSession = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; /* eslint-disable new-cap */


var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

var _xml2js = require('xml2js');

var _xml2js2 = _interopRequireDefault(_xml2js);

var _immutable = require('immutable');

var _requestRx = require('./request-rx');

var _hpeApiError = require('./hpe-api-error');

var _hpeApiPipeline = require('./hpe-api-pipeline');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var HpeApiBuildSession = exports.HpeApiBuildSession = (0, _immutable.Record)({
  session: null,
  ciServerId: null,
  pipelineId: null,
  buildId: null,
  buildName: null
});

HpeApiBuildSession.create = function (session, ciServerId, pipelineId, buildId, buildName) {
  return new HpeApiBuildSession({
    session: session,
    ciServerId: ciServerId,
    pipelineId: pipelineId,
    buildId: buildId,
    buildName: buildName
  });
};

HpeApiBuildSession.getWorkspaceUri = function (session) {
  return _url2.default.resolve(session.config.hpeServerUrl, _util2.default.format('/api/shared_spaces/%s/workspaces/%s', session.config.hpeSharedSpace, session.config.hpeWorkspace));
};

HpeApiBuildSession.reportBuildPipelineStepStatus = function (buildSession, stepId, startTime, duration, status, result) {
  var jobCiId = _hpeApiPipeline.HpeApiPipeline.jobIdForStep(buildSession.pipelineId, stepId);
  var rootJobCiId = _hpeApiPipeline.HpeApiPipeline.jobIdForStep(buildSession.pipelineId, 'pipeline');

  var data = {
    serverCiId: buildSession.ciServerId,
    jobCiId: jobCiId,
    buildCiId: buildSession.buildId,
    buildName: buildSession.buildName,
    startTime: startTime,
    duration: duration,
    status: status,
    result: result
  };

  if (jobCiId !== rootJobCiId) {
    data.causes = [{
      jobCiId: rootJobCiId,
      buildCiId: buildSession.buildId
    }];
  }

  var options = {
    uri: _util2.default.format('%s/analytics/ci/builds/', HpeApiBuildSession.getWorkspaceUri(buildSession.session)),
    json: true,
    body: data
  };

  return _requestRx.RequestRx.put(buildSession.session.request, options).map(function (response) {
    if (response.statusCode !== 200) {
      throw _hpeApiError.HpeApiError.create(response.statusCode, JSON.stringify(response.body, null, 2));
    }

    return _extends({}, data, response.body);
  });
};

HpeApiBuildSession.reportBuildPipelineTestResults = function (buildSession, stepId, testResults) {
  var xmlBuilder = new _xml2js2.default.Builder();
  var jobCiId = _hpeApiPipeline.HpeApiPipeline.jobIdForStep(buildSession.pipelineId, stepId);
  var testResult = testResults[0];

  var testRun = {
    $: {
      name: testResult.name,
      started: testResult.started,
      duration: testResult.duration,
      status: testResult.status
    }
  };

  if (testResult.errorType) {
    testRun.error = {
      $: {
        type: testResult.errorType,
        message: testResult.errorMessage
      }
    };
  }

  if (testResult.errorStackTrace) {
    testRun.error._ = testResult.errorStackTrace;
  }

  var data = xmlBuilder.buildObject({
    test_result: {
      build: {
        $: {
          server_id: buildSession.ciServerId,
          job_id: jobCiId,
          job_name: jobCiId,
          build_id: buildSession.buildId,
          build_name: buildSession.buildName
        }
      },
      test_runs: {
        test_run: testRun
      }
    }
  });

  var options = {
    uri: _util2.default.format('%s/test-results/', HpeApiBuildSession.getWorkspaceUri(buildSession.session)),
    'content-type': 'application/xml',
    body: data
  };

  return _requestRx.RequestRx.post(buildSession.session.request, options).map(function (response) {
    if (response.statusCode !== 202) {
      throw _hpeApiError.HpeApiError.create(response.statusCode, JSON.stringify(response.body, null, 2));
    }

    return _extends({}, data, response.body);
  });
};