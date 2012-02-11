const Ci = Components.interfaces;
const Cc = Components.classes;

const wm = Cc["@mozilla.org/appshell/window-mediator;1"]
             .getService(Ci.nsIWindowMediator);

try {
  const probes = Cc["@mozilla.org/base/probes;1"]
                   .getService(Ci.nsIProbeService);
} catch(e) {
  console.error("Could not load nsIProbeService");
  throw new Error("I can't go on without my probes.");
}

var mainWindow = wm.getMostRecentWindow("navigator:browser");
var gBrowser = mainWindow.gBrowser;

var urlListener = {
    QueryInterface: function(aIID) {
        if (aIID.equals(Ci.nsIWebProgressListener) ||
            aIID.equals(Ci.nsISupportsWeakReference) ||
            aIID.equals(Ci.nsISupports))
            return this;
        throw Components.results.NS_NOINTERFACE;
    },

    onLocationChange: function(aProgress, aRequest, aURI) {
        window.console.log("new URI: " + aURI.spec);
    }
};

window.console.log("added listener");

window.addEventListener('unload', function() {
    gBrowser.removeProgressListener(urlListener);
    stopProbes();
});

gBrowser.addProgressListener(urlListener);

// If scrolling through real-time data, advance this whenever dropping off
// data points.
var firstGCIndex = 0;
var timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
const TYPE_REPEATING_SLACK = Ci.nsITimer.TYPE_REPEATING_SLACK;
var activeHandlers = [];

const BYTES_PER_KB = Math.pow(2, 10);
const BYTES_PER_MB = Math.pow(2, 20);
const BYTES_PER_GB = Math.pow(2, 30);

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = MS_PER_SECOND * 1000;
const MS_PER_HOUR = MS_PER_MINUTE * 60;

results = [];

timerCb = {};

function stopProbes() {
    if (!probes) return;

    while (activeHandlers.length) {
	probes.removeHandler(activeHandlers.pop());
    }

    timer.cancel();
    timer = null;
    probes = null;
}

function execOnProbeThread(func, callback) {
  var execStr = func.toString();
  execStr = execStr.substring(execStr.indexOf("{") + 1,
                              execStr.lastIndexOf("}"));
  probes.asyncQuery(execStr, callback);
}

function registerProbe(probepoint, captureArgs, func) {
  var usingStr = "using(" + captureArgs.join(");using(") + ");";
  var execStr = func.toString();
  execStr = execStr.substring(execStr.indexOf("{") + 1,
                              execStr.lastIndexOf("}"));
  var cookie = probes.addHandler(probepoint, usingStr, execStr);
  activeHandlers.push(cookie);
}

function gatherDataFromProbeThreadPeriodically(intervalMS,
                                               probeThreadFunc,
                                               thisThreadProcessFunc) {
  timerCb = {
    observe: function(subject, topic, data) {
      execOnProbeThread(probeThreadFunc, thisThreadProcessFunc);
    }
  };

  timer.init(timerCb, intervalMS, TYPE_REPEATING_SLACK);
}

var outputDomNode = document.getElementById("oot");
function prettyPrint(obj) {
  var s = JSON.stringify(obj, 0, 2),
      tn = document.createTextNode(s);
  outputDomNode.appendChild(tn);
}

/**
 * These are the GC probes from about:gc, re-written to use the registerProbe
 * idiom above that scrapes source out of functions and tries to look pretty.
 *
 * Their general goal is to produce a list of GC info where the items look like:
 *  [GC start timestamp, GC end timestamp, before bytes, after bytes].  There
 *  are also heap resize events of the form [timestamp, old bytes, new bytes].
 *  These all end up living in tagged objects, and compartment and global GCs
 *  are distinguished from each other.
 */
function activateGCProbes() {
  execOnProbeThread(function() {
    var pendingData = [],
        HEAP_RESIZE_INTERVAL = 500.0, // minimum MS between posted events
        lastRecTime = 0,
        current;
  });

  registerProbe(
    probes.COMPARTMENT_GC_DID_START,
    ["env.currentTimeMS", "runtime.gcBytes"],
    function() {
      current = {
        type: 'GC_COMPARTMENT',
        data: [env.currentTimeMS, 0, runtime.gcBytes, 0],
        sortValue: env.currentTimeMS };
    });

  registerProbe(
    probes.GLOBAL_GC_DID_START,
    ["env.currentTimeMS", "runtime.gcBytes"],
    function() {
      current = {
        type: 'GC_GLOBAL',
        data: [env.currentTimeMS, 0, runtime.gcBytes, 0],
        sortValue: env.currentTimeMS
      };
    });

  registerProbe(
    probes.JS_WILL_RESIZE_HEAP,
    ["env.currentTimeMS", "oldSize", "newSize"],
    function() {
      if ((env.currentTimeMS - lastRecTime) > HEAP_RESIZE_INTERVAL) {
        lastRecTime = env.currentTimeMS;
        pendingData.push({
          type: 'HEAP_RESIZE',
          sortValue: env.currentTimeMS,
          data: [env.currentTimeMS, oldSize, newSize]
        });
      }
    });

  registerProbe(
    probes.COMPARTMENT_GC_WILL_END,
    ["env.currentTimeMS", "runtime.gcBytes"],
    function() {
      current.data[1] = env.currentTimeMS;
      current.data[3] = runtime.gcBytes;
      pendingData.push(current);
    });

  registerProbe(
    probes.GLOBAL_GC_WILL_END,
    ["env.currentTimeMS", "runtime.gcBytes"],
    function() {
      current.data[1] = env.currentTimeMS;
      current.data[3] = runtime.gcBytes;
      pendingData.push(current);
    });

  gatherDataFromProbeThreadPeriodically(
    1000,
    function onProbeThread() {
      postMessage(pendingData);
      pendingData = [];
    },
    function onOurThread(e) {
      prettyPrint(e.value);
    });
}

activateGCProbes();
