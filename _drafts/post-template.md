---
# HOW TO PUBLISH A POST
# 1. Copy this file into the _posts folder.
# 2. Rename it with a date first: _posts/2026-12-01-your-title.md
#    Without the date in the file name, Jekyll does not publish the post.
#    A date in the future is not published either.
# 3. Edit the lines below, replace the text, then commit and push.
title: Your post title
subtitle: One sentence that says what the post is about
tags: [power electronics]
math: true    # set to false if the post has no equations
cite: true    # shows a "Cite this post" box
---

Start with a short paragraph that tells the reader what they will learn.

## A section heading

Normal text with a [link](https://www.kth.se/), **bold** and *italics*. An inline equation looks like $$v_{DS} = R_{DS(on)} \, i_D$$, and a displayed one like this:

$$
P_{sw} = f_{sw} \left( E_{on} + E_{off} \right)
$$

## Figures

Put images in `assets/img` and include them like this:

`![What the figure shows](/assets/img/my-figure.png)`

## Code

```matlab
m = 0.85;                      % modulation index
d = 0.5 * (1 + m * sin(wt));   % duty cycle
```

## Tables

| Device | Voltage | Current |
|:-------|--------:|--------:|
| Example | 1200 V | 400 A |
