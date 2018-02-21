import { EventData } from "data/observable";
import { RadSideDrawer } from "nativescript-pro-ui/sidedrawer";
import { RadAutoCompleteTextView } from "nativescript-pro-ui/autocomplete";
import { topmost } from "ui/frame";
import { NavigatedData, Page } from "ui/page";
import { TextField } from "ui/text-field";
import { Image } from "ui/Image";
import { Popup } from "nativescript-popup";

import { Model } from "./model";

let page;
let model = new Model();

/************************************************************
 * Use the "onNavigatingTo" handler to initialize the page binding context.
 *************************************************************/
export function onNavigatingTo(args: NavigatedData) {
    /************************************************************
     * The "onNavigatingTo" event handler lets you detect if the user navigated with a back button.
     * Skipping the re-initialization on back navigation means the user will see the
     * page in the same data state that he left it in before navigating.
     *************************************************************/
    if (args.isBackNavigation) {
        return;
    }

    page = <Page>args.object;
    page.bindingContext = model;
    model.recipientTextField =  <TextField>page.getViewById("recipientTextField");
    model.delivererTextField =  <TextField>page.getViewById("delivererTextField");
    model.clerkTextField =  <TextField>page.getViewById("clerkTextField");
    model.signatureImage = <Image>page.getViewById("signature");
}

export function showRecipientPopup(args) {
    model.showPopup(page.getViewById("recipientTextField"), "~/template/recipientlist.xml");
}
/************************************************************
 * According to guidelines, if you have a drawer on your page, you should always
 * have a button that opens it. Get a reference to the RadSideDrawer view and
 * use the showDrawer() function to open the app drawer section.
 *************************************************************/
export function onDrawerButtonTap(args: EventData) {
    const sideDrawer = <RadSideDrawer>topmost().getViewById("sideDrawer");
    sideDrawer.showDrawer();
}
