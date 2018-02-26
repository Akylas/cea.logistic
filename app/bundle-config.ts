if (global.TNS_WEBPACK) {
    // registers tns-core-modules UI framework modules
    require("bundle-entry-points");

    require('moment');
    require('nativescript-popup');

    // register application modules
    global.registerModule("nativescript-pro-ui/sidedrawer", () => require("../node_modules/nativescript-pro-ui/sidedrawer"));
    global.registerModule("nativescript-pro-ui/listview", () => require("../node_modules/nativescript-pro-ui/listview"));
    global.registerModule("nativescript-barcodescanner", () => require("../node_modules/nativescript-barcodescanner"));
    global.registerModule("nativescript-textinputlayout", () => require("../node_modules/nativescript-textinputlayout"));
    global.registerModule("nativescript-drawingpad", () => require("../node_modules/nativescript-drawingpad"));
    global.registerModule("nativescript-share-file", () => require("../node_modules/nativescript-share-file"));
    global.registerModule("nativescript-localize", () => require("../node_modules/nativescript-localize"));
    global.registerModule("nativescript-vibrate", () => require("../node_modules/nativescript-vibrate"));
    // global.registerModule("nativescript-popup", () => require("../node_modules/nativescript-popup"));

    // register application modules
    // This will register each `page` postfixed xml, css, js, ts, scss etc. in the app/ folder
    const context = require.context("~/", true, /(page|fragment|ctextfield)\.(xml|css|js|ts|scss)$/);
    global.registerWebpackModules(context);
}
