# Disclaimer
https://ram-prices.github.io/eftracker/ is a **<ins>100% vibe-coded</ins>** Endfield pull history tracker that was created because, despite the known risks of uploading account tokens and running random powershell scripts, trackers STILL ask for your token.

Ironically, yes, you still need to find your token and extract your pull history. The site will not do it for you, and it was made that way intentionally. I uploaded a Python script to this repository that can extract the token and dump the pull history to a JSON file, but that completely defeats the purpose of not running random scripts you found online. Ask someone you trust to make one for you, vibe-code your own, or learn how to manually make one yourself.

This site is not meant to compete and/or take away traffic from legitimately coded tracking website. I like visualizing my data, but I have close to 0 programming skills and no sites offered the features that I wanted.

Again, this thing is 100% vibe-coded. It will look vibe-coded, smell vibe-coded, and taste vibe-coded. Thank you for reading and understanding.

# Features
- Pull history dashboard for Operators and Arsenals, with pity/luck tracking per banner
- Patch Stats: pull investment and 6★ breakdown by game update
- Pull Planner: "if I pull N more times, what's my chance of getting the rate-up?" for Chartered, Joint, and Arsenal banners, using your real current pity as a starting point (editable)
- Banner data (names, rate-up characters/weapons, patch mapping) is pulled live from [ram-prices/ef-assets](https://github.com/ram-prices/ef-assets), not hardcoded here

# Structure
`index.html` + `js/*.js` (plain scripts, no build step, no framework). See `CLAUDE.md` if you're a coding agent picking this up — it covers the module layout and a couple of non-obvious gotchas in the pity math.

# Bugs
Yes.
