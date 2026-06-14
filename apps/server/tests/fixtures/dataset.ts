import type { SponsorSegment } from '../../src/types';

export interface BenchmarkFixture {
  name: string;
  transcript: string;
  expectedSegments: SponsorSegment[];
}

export const dataset: BenchmarkFixture[] = [
  {
    name: 'Aggressive multi-minute mid-roll sponsor',
    transcript: `
[00:00:00] Welcome back to the channel.
[00:00:05] Today we are going to build a new application using TypeScript and Bun.
[00:00:15] We will cover routing, validation, and testing.
[00:00:30] Let's get started by setting up the project structure.
[00:00:45] But before we dive too deep into the code, I want to take a moment to thank the sponsor of today's video, SecureNet VPN.
[00:00:55] Protecting your online data has never been more important.
[00:01:05] SecureNet VPN offers military-grade encryption and a strict no-logs policy, meaning your browsing history is completely private.
[00:01:15] They have over 5,000 servers in 60 countries, allowing you to bypass geo-restrictions and watch your favorite shows from anywhere in the world.
[00:01:30] And with their built-in ad blocker, you can browse the web without annoying interruptions.
[00:01:40] Best of all, one account protects up to 10 devices simultaneously, so you can secure your phone, laptop, and tablet all at once.
[00:01:55] If you use the link in the description below, you can get 75% off their two-year plan, plus three extra months for free.
[00:02:10] That comes down to just $2.99 a month. 
[00:02:15] Thanks again to SecureNet VPN for sponsoring this video and supporting the channel.
[00:02:20] Alright, let's jump back into the code and see how we can configure our database connection.
[00:02:30] As you can see here, we are using a PostgreSQL instance...
    `.trim(),
    expectedSegments: [
      {
        uuid: 'test-uuid-1',
        start: 45,
        end: 140, // [00:02:20]
        category: 'sponsor',
      },
    ],
  },
  {
    name: 'Integrated creator merch plug',
    transcript: `
[00:00:00] Before we get started with today's tutorial, I just wanted to quickly shout out the new apparel line we dropped yesterday.
[00:00:05] I'm currently wearing the new "Code Like a Pro" limited edition hoodie, and it is incredibly comfortable.
[00:00:15] We spent months picking the right fabric, and I'm super proud of how it turned out.
[00:00:20] The stock is extremely limited, so if you want to support the channel and look good doing it, click the link in the description or go to mymerchstore.com.
[00:00:30] Now, let's talk about the new features in React 19.
[00:00:35] The biggest change is the introduction of the new compiler...
    `.trim(),
    expectedSegments: [
      {
        uuid: 'test-uuid-2',
        start: 0,
        end: 30, // [00:00:30]
        category: 'merch',
      },
    ],
  },
  {
    name: 'Sudden creator intro',
    transcript: `
[00:00:00] Today, we're exploring an abandoned nuclear facility.
[00:00:05] Let's go.
[00:00:07] [Upbeat electronic intro music playing]
[00:00:10] Urban Explorers Episode 42
[00:00:15] Directed by Alex Smith
[00:00:20] [Music fades out]
[00:00:22] We just arrived at the perimeter fence.
[00:00:25] It looks like the main gate is locked, but we might be able to find a way around back.
    `.trim(),
    expectedSegments: [
      {
        uuid: 'test-uuid-3',
        start: 7,
        end: 22,
        category: 'intro_creator',
      },
    ],
  },
  {
    name: 'Silent video / No promotional filler',
    transcript: `
[00:00:00] [wind blowing through trees]
[00:00:15] [footsteps crunching on dry leaves]
[00:00:30] This forest has remained completely untouched by human civilization for over three centuries.
[00:00:45] The density of the canopy prevents most sunlight from reaching the forest floor.
[00:01:00] [distant bird calls]
[00:01:15] We can see the unique flora that has adapted to this low-light environment.
[00:01:30] Notice the vibrant green moss covering the fallen logs.
    `.trim(),
    expectedSegments: [],
  },
];
