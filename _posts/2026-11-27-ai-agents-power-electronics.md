---
title: "My AI has ADHD: why power electronics needs its own research agent"
description: AI already does most of my research work. But when I ask it to run a whole project, it gets lost. I think our field needs its own agent.
categories: [Academia]
tags: [ai, research, agents, phd life]
math: false
---

I believe AI will do research better than humans, and soon. Nobody needs my belief, though. We have already seen it happen.

This month, [Levent Alpöge](https://terrytao.wordpress.com/2026/11/20/unforced-euler-singularity-unforced-navier-stokes-singularity-and-the-generalized-riemann-hypothesis/) published a proof of the Riemann hypothesis written together with an AI model. It is an enormous proof in Lean, a language that lets a computer check every step. Only a month earlier, Terence Tao had said that a combination of humans and AI might solve it [around 2050](https://officechai.com/ai/terence-tao-had-a-month-ago-that-ai-could-solve-riemann-hypothesis-only-by-2050/). It came 24 years early. Mathematicians are now trying to turn it into a proof that people can actually read.

If that can happen in mathematics, I do not see why it cannot happen in power electronics.

## How I use AI today

I use AI for almost everything in my research, and I am happy with it.

I cannot draw a PCB well, but it can. I cannot write an optimization routine that connects several different programs, a circuit simulator, a FEM tool and a script that glues them together, but it can. It writes code, reads papers, checks my derivations and fixes my English.

Sometimes I feel like a pharaoh building a pyramid. As long as I have tokens left, I have no mercy. Do this, now do that, again, faster.

## Where it breaks

The problem starts when I let the AI work on its own.

If I build a system around it, an agent harness that should take a research project from start to finish, the AI gets confused and loses its way. It feels like it has ADHD. Either it jumps from one thing to the next, or it gets stuck on one small part and tries to make it perfect while the rest of the project waits.

So in the end, I still have to steer it step by step, with very precise instructions. It is a very good assistant. It is not yet a researcher.

## How we actually do research

I think the difference is in what we ignore.

When a human researcher starts a project, at least in power electronics, the first thing we do is ignore almost everything. Parasitics, thermal design, EMI, the perfect controller: later. We just want a first iteration. A rough simulation, a quick prototype, something that switches.

Then the problems show up. The waveform rings, the device gets hot, the measurement makes no sense. We try to solve them, one at a time.

And often the interesting part is not where we planned it. Sometimes the original idea gives no new contribution at all, but the problem we found on the way does. A good part of our papers are born like this.

An AI agent does the opposite. It does not know what is safe to ignore. It treats every detail as equally important, so either it tries to solve all of them at once, or it falls into one and never comes out. And it does not notice when the side problem is more interesting than the main one.

## Someone should build it

I could not build this kind of agent myself. But I think someone in our community should.

What I have in mind is an agent harness made for power electronics. One that knows how our research works: start rough, simulate, build, measure, find what is wrong, decide what matters, and go around again. One that knows our tools, from circuit simulators to PCB design to the oscilloscope, and knows that a converter which works in simulation has not yet worked.

The models are already strong enough to do each step. What is missing is the method that connects them, and that method is exactly the experience of our field. It is not something a general AI company will write for us.

Building it would be a nice project. Maybe even a better one than most of the papers it would help us write.
