import { EventData } from "data/observable";
import { RadSideDrawer } from "nativescript-pro-ui/sidedrawer";
import { RadAutoCompleteTextView } from "nativescript-pro-ui/autocomplete";
import { SwipeActionsEventData, RadListView } from "nativescript-pro-ui/listview";
import { topmost } from "ui/frame";
import { NavigatedData, Page, View } from "ui/page";
import { Image } from "ui/Image";
import { Popup } from "nativescript-popup";
import { CTextField } from "../shared/ctextfield";
import { handleClearFocus } from "../utilsAndroid";

import { Model } from "./model";

let page;
let model = new Model();

/************************************************************
 * Use the "onNavigatingTo" handler to initialize the page binding context.
 ***********setFocusable*************************************/
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
    model.recipientTextField = <CTextField>page.getViewById("recipientTextField");
    model.delivererTextField = <CTextField>page.getViewById("delivererTextField");
    model.clerkTextField = <CTextField>page.getViewById("clerkTextField");
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
    const sideDrawer = <RadSideDrawer>page.getViewById("sideDrawer");
    sideDrawer.showDrawer();
}

export function onSwipeCellStarted(args: SwipeActionsEventData) {
    const swipeLimits = args.data.swipeLimits;
    const swipeView = args.object;
    const rightItem = swipeView.getViewById<View>("delete-view");
    swipeLimits.right = rightItem.getMeasuredWidth();
}

export function onRightSwipeClick(args) {
    const listView = <RadListView>page.getViewById("scansListView");
    console.log("Right swipe click");
    const index = model.scans.indexOf(args.object.bindingContext);
    model.scans.splice(index, 1);
    listView.notifySwipeToExecuteFinished();
}

export function onTabChanged(args) {
    const listView = <RadListView>page.getViewById("scansListView");
    handleClearFocus(page.android);
    listView.notifySwipeToExecuteFinished();
}
