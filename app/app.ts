/*
In NativeScript, the app.ts file is the entry point to your application.
You can use this file to perform app-level initialization, but the primary
purpose of the file is to pass control to the app’s first module.
*/

import * as app from "application";
import "./bundle-config";
import * as moment from "moment";
import * as localize from "nativescript-localize";
import { device } from "platform";

moment.locale(device.language.substring(0, 2));

app.setResources({
    L: localize,
    dateFormat: "L LT",
    dateFormatter: function(timestamp: number, format: string) {
        // return timestamp;
        return moment(timestamp).format(format);
    }
});

app.start({ moduleName: "home/page" });

/*
Do not place any code after the application has been started as it will not
be executed on iOS.
*/
