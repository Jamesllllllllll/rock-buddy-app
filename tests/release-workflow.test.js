const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const yaml = require('js-yaml');
const { execFileSync } = require('node:child_process');

test('push CI cannot package, upload, or publish a release', () => {
    const workflow = yaml.load(fs.readFileSync('.github/workflows/build.yml','utf8'));
    assert.deepEqual(workflow.on.push, { branches: ['main', 'develop'] });
    assert.ok(Object.hasOwn(workflow.on, 'pull_request'));
    assert.deepEqual(workflow.permissions, {contents:'read'});
    assert.equal(workflow.on.workflow_dispatch.inputs.installer.default,'none');
    assert.equal(workflow.concurrency['cancel-in-progress'], "${{ github.event_name != 'workflow_dispatch' }}");
    for (const job of Object.values(workflow.jobs)) {
        for (const step of job.steps) {
            if (/package:|electron-builder|upload-artifact|dotnet publish|prepare-installer|check-installer|smoke-staging-installer/.test(step.run || step.uses || '')) {
                assert.match(step.if, /github.event_name == 'workflow_dispatch'/);
            }
            assert.doesNotMatch(step.run || '', /gh release create|--publish always/);
        }
    }
    const upload = workflow.jobs.build_on_win.steps.find(step=>step.uses?.includes('upload-artifact'));
    assert.equal(upload.with['retention-days'],7);
});

test('test and production installers have separate feeds and keep their established identities', () => {
    const config = target => JSON.parse(execFileSync(process.execPath,['-e',"console.log(JSON.stringify(require('./electron-builder.release.cjs')))"], {
        env:{...process.env,ROCK_BUDDY_PACKAGE_TARGET:target}, encoding:'utf8',
    }));
    const beta=config('beta');
    const production=config('production');
    assert.equal(beta.appId,'com.rockbuddy.beta');
    assert.equal(beta.extraMetadata.name,'rock-buddy-beta');
    assert.equal(beta.publish.channel,'beta');
    assert.match(beta.publish.url,/Jamesllllllllll\/rock-buddy-app\/releases\/download\/desktop-beta/);
    assert.equal(production.extraMetadata.name,'rock-buddy');
    assert.equal(production.extraMetadata.rockBuddyBackend,'production');
    assert.equal(production.publish.owner,'tnt-coders');
    assert.equal(production.appId,require('../package.json').build.appId);
});
