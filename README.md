This is intended to be a super simple playground for JSProbes.  It is a simple
restartless add-on that adds an "about:jsprobes" URL that displays/runs
about-jsprobes.html and about-jsprobes.js with chrome privileges.  The probes
will not be active until you create the page.  The probes will ideally stop
once you close the page.

Your stock Firefox does not include jsprobes support.  To get said support, you
need to apply the patch queue from: https://bitbucket.org/asuth/jsprobes-patches
and modify your .mozconfig to include:

    ac_add_options --enable-jsprobes

You can also try and use a build spun by someone else.

This add-on is derived from about:gc by Steve Fink (and later amended by Brian
Burg to support JSProbes.)

If you want to learn about JSProbes, you want to see:

- http://brrian.tumblr.com/post/10571624125/jsprobes
- http://blog.mozilla.com/sfink/2011/09/21/js-probes/
