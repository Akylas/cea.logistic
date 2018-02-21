import * as pages from "tns-core-modules/ui/page";
import * as textField from "tns-core-modules/ui/text-field";
import * as observable from "tns-core-modules/data/observable";
import { DrawingPad } from 'nativescript-drawingpad';

let context: any;
let closeCallback: Function;

let page: pages.Page;
let drawingPad:DrawingPad;

export function showingModally(args: pages.ShownModallyData) {
    console.log("login-page.onShownModally, context: " + args.context);
    context = args.context;
    closeCallback = args.closeCallback;
}

export function onLoaded(args: observable.EventData) {
    page = <pages.Page>args.object;
    drawingPad = page.getViewById<DrawingPad>("drawingPad");
    // passwordTextField = page.getViewById<textField.TextField>("password");
}

export function onUnloaded() {
}

export function onDone(args) {
    page = <pages.Page>args.object;
    drawingPad.getDrawing().then(function(data) {
        closeCallback(null, data);
    }, function(err) {
        closeCallback(err);
    });
}