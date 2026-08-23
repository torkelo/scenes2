import assert from 'node:assert/strict';
import test from 'node:test';

import {
  extractMentionedUserIds,
  findMentions,
  mentionsTeamMember,
  resolveMentions,
  shouldFetchThread,
  type ChannelData,
} from './slack-helpers.js';

const TEAM_IDS = ['U111', 'U222'];

test('shouldFetchThread requires replies and substantive parent text', () => {
  assert.equal(shouldFetchThread('short', 0), false);
  assert.equal(shouldFetchThread('short', 2), false);
  assert.equal(shouldFetchThread('x'.repeat(60), 1), true);
  assert.equal(shouldFetchThread('Any questions?', 1), true);
  assert.equal(shouldFetchThread('Ping <@U999>', 1), true);
});

test('mentionsTeamMember matches configured Slack user IDs', () => {
  assert.equal(
    mentionsTeamMember('Hi <@U111> can you review?', TEAM_IDS),
    true,
  );
  assert.equal(mentionsTeamMember('No mentions here', TEAM_IDS), false);
  assert.equal(mentionsTeamMember('Hi <@U111>', []), false);
});

test('findMentions drops self-mentions and messages authored by team members', () => {
  const channelData: ChannelData[] = [
    {
      id: 'C1',
      name: 'product-design',
      messages: [
        {
          ts: '1',
          user: 'U999',
          text: 'Need eyes from <@U111>',
          replies: [
            {
              ts: '2',
              user: 'U111',
              text: '<@U222> what do you think?',
            },
          ],
        },
        {
          ts: '3',
          user: 'U111',
          text: 'Self mention <@U111>',
        },
      ],
    },
  ];

  const hits = findMentions(channelData, TEAM_IDS);
  assert.equal(hits.length, 1);
  assert.equal(hits[0]?.text, 'Need eyes from <@U111>');
  assert.equal(hits[0]?.user, 'U999');
});

test('extractMentionedUserIds pulls user IDs from in-text mentions', () => {
  assert.deepEqual(
    extractMentionedUserIds('ping <@U111> & <@W222|ed> not <#C333|chan>'),
    ['U111', 'W222'],
  );
  assert.deepEqual(extractMentionedUserIds('no mentions here'), []);
});

test('resolveMentions rewrites known IDs to names', () => {
  const userMap = { U111: 'Ed Poole', U222: 'Ben Darlow' };
  assert.equal(
    resolveMentions('can <@U111> & <@U222> review?', userMap),
    'can Ed Poole & Ben Darlow review?',
  );
  assert.equal(
    resolveMentions('thanks <@U222|ben>', userMap),
    'thanks Ben Darlow',
  );
});

test('resolveMentions falls back to @ID rather than guessing a name', () => {
  assert.equal(
    resolveMentions('asked <@U999> to comment', {}),
    'asked @U999 to comment',
  );
});
