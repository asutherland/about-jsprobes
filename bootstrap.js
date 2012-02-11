const Cc = Components.classes;
const Ci = Components.interfaces;
const Cm = Components.manager;

var testing = false;

Cm.QueryInterface(Ci.nsIComponentRegistrar);

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
Components.utils.import('resource://gre/modules/Services.jsm');

function AboutJSProbes() {}

AboutJSProbes.prototype = {
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIAboutModule]),
  classDescription: 'about:jsprobes',
  classID: Components.ID('{ced45ce8-a0ee-4dbd-8099-1a27f60e83c6}'),
  contractID: '@mozilla.org/network/protocol/about;1?what=jsprobes',

  newChannel: function(uri)
  {
    var channel = Services.io.newChannel(
                    'resource://aboutjsprobes/about-jsprobes.html', null, null);
    var securityManager = Cc['@mozilla.org/scriptsecuritymanager;1']
                            .getService(Ci.nsIScriptSecurityManager);
    var principal = securityManager.getSystemPrincipal(uri);
    channel.originalURI = uri;
    channel.owner = principal;

  // var c=  Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
  //     c.logStringMessage("uri = " + uri.toString());

    return channel;
  },

  getURIFlags: function(uri)
  {
    return Ci.nsIAboutModule.URI_SAFE_FOR_UNTRUSTED_CONTENT |
           Ci.nsIAboutModule.ALLOW_SCRIPT;
  }
};

const AboutJSProbesFactory =
  XPCOMUtils.generateNSGetFactory([AboutJSProbes])(
    AboutJSProbes.prototype.classID);

const APP_STARTUP = 1;
const ADDON_ENABLE = 3;
const ADDON_UPGRADE = 7;

function startup(aData, aReason) {
  Cm.registerFactory(AboutJSProbes.prototype.classID,
                     AboutJSProbes.prototype.classDescription,
                     AboutJSProbes.prototype.contractID,
                     AboutJSProbesFactory);
  var fileuri = Services.io.newFileURI(aData.installPath);
  if (!aData.installPath.isDirectory())
    fileuri = Services.io.newURI('jar:' + fileuri.spec + '!/', null, null);
  Services.io.getProtocolHandler('resource').QueryInterface(Ci.nsIResProtocolHandler).setSubstitution('aboutjsprobes', fileuri);
}

function shutdown(aData, aReason) {
  Services.io.getProtocolHandler('resource').QueryInterface(Ci.nsIResProtocolHandler).setSubstitution('aboutjsprobes', null);
  Cm.unregisterFactory(AboutJSProbes.prototype.classID, AboutJSProbesFactory);
}
function install(aData, aReason) { }
function uninstall(aData, aReason) { }
