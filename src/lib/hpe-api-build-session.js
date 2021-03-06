/* eslint-disable new-cap */
import url from 'url';
import util from 'util';
import Xml2js from 'xml2js';
import { Record } from 'immutable';
import { RequestRx } from 'lib/request-rx';
import { HpeApiError } from 'lib/hpe-api-error';
import { HpeApiPipeline } from 'lib/hpe-api-pipeline';

export const HpeApiBuildSession = Record({
  session: null,
  ciServerId: null,
  pipelineId: null,
  buildId: null,
  buildName: null,
});

HpeApiBuildSession.create = (session, ciServerId, pipelineId, buildId, buildName) =>
  new HpeApiBuildSession({
    session,
    ciServerId,
    pipelineId,
    buildId,
    buildName,
  });

HpeApiBuildSession.getWorkspaceUri = (session) =>
  url.resolve(session.config.hpeServerUrl, util.format(
    '/api/shared_spaces/%s/workspaces/%s',
    session.config.hpeSharedSpace,
    session.config.hpeWorkspace));

HpeApiBuildSession.reportBuildPipelineStepStatus =
  (buildSession, stepId, startTime, duration, status, result) => {
    const jobCiId = HpeApiPipeline.jobIdForStep(buildSession.pipelineId, stepId);
    const rootJobCiId = HpeApiPipeline.jobIdForStep(buildSession.pipelineId, 'pipeline');

    const data = {
      serverCiId: buildSession.ciServerId,
      jobCiId,
      buildCiId: buildSession.buildId,
      buildName: buildSession.buildName,
      startTime,
      duration,
      status,
      result,
    };

    if (jobCiId !== rootJobCiId) {
      data.causes = [
        {
          jobCiId: rootJobCiId,
          buildCiId: buildSession.buildId,
        },
      ];
    }

    const options = {
      uri: util.format(
        '%s/analytics/ci/builds/',
        HpeApiBuildSession.getWorkspaceUri(buildSession.session)),
      json: true,
      body: data,
    };

    return RequestRx
      .put(buildSession.session.request, options)
      .map(response => {
        if (response.statusCode !== 200) {
          throw HpeApiError.create(
            response.statusCode,
            JSON.stringify(response.body, null, 2));
        }

        return {
          ...data,
          ...response.body,
        };
      });
  };

HpeApiBuildSession.reportBuildPipelineTestResults = (buildSession, stepId, testResults) => {
  const xmlBuilder = new Xml2js.Builder();
  const jobCiId = HpeApiPipeline.jobIdForStep(buildSession.pipelineId, stepId);
  const testResult = testResults[0];

  const testRun = {
    $: {
      name: testResult.name,
      started: testResult.started,
      duration: testResult.duration,
      status: testResult.status,
    },
  };

  if (testResult.errorType) {
    testRun.error = {
      $: {
        type: testResult.errorType,
        message: testResult.errorMessage,
      },
    };
  }

  if (testResult.errorStackTrace) {
    testRun.error._ = testResult.errorStackTrace;
  }

  const data = xmlBuilder.buildObject({
    test_result: {
      build: {
        $: {
          server_id: buildSession.ciServerId,
          job_id: jobCiId,
          job_name: jobCiId,
          build_id: buildSession.buildId,
          build_name: buildSession.buildName,
        },
      },
      test_runs: {
        test_run: testRun,
      },
    },
  });

  const options = {
    uri: util.format('%s/test-results/', HpeApiBuildSession.getWorkspaceUri(buildSession.session)),
    'content-type': 'application/xml',
    body: data,
  };

  return RequestRx
    .post(buildSession.session.request, options)
    .map(response => {
      if (response.statusCode !== 202) {
        throw HpeApiError.create(
          response.statusCode,
          JSON.stringify(response.body, null, 2));
      }

      return {
        ...data,
        ...response.body,
      };
    });
};
