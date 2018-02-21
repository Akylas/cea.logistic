/// <reference path="../../node_modules/tns-platform-declarations/android.d.ts" />
import { Observable, EventData } from "data/observable";
import { ObservableArray } from "data/observable-array";
import { BarcodeScanner } from "nativescript-barcodescanner";
import { alert } from "ui/dialogs";
import { Page } from "ui/page";
import { Label } from "ui/label";
import * as appSettings from "application-settings";
import { Popup } from "nativescript-popup";
import { ItemEventData } from "ui/list-view/list-view";
import { TextField } from "ui/text-field";
import * as fs from "file-system";
import * as builder from "ui/builder";
import { Image } from "ui/Image";
import * as imageSource from "image-source";
import * as utils from "utils/utils";
import { localize } from "nativescript-localize";
import { ShareFile } from "nativescript-share-file";
import * as moment from "moment";

import { device, platformNames } from "platform";

import { Vibrate } from "nativescript-vibrate";
const vibrator = new Vibrate();

function ObservableArrayToString(array: ObservableArray<any>) {
    let res = [];
    array.forEach(s => res.push(s));
    return JSON.stringify(res);
}

class FilteredList extends Observable {
    _value: string;
    savekey: string;
    _textField: TextField;
    constructor(private key: string, private parent: Model) {
        super();
        this.savekey = "saved" + key;
        this.items = new ObservableArray<string>();
        this.filteredItems = new ObservableArray<any>();
        let saved: string[] = JSON.parse(appSettings.getString(this.savekey) || "[]");
        console.log("saved", this.savekey, JSON.stringify(saved));
        saved.forEach(s => this.items.push(s));
    }
    get items(): ObservableArray<string> {
        return this.get("_items");
    }
    set items(value: ObservableArray<string>) {
        this.set("_items", value);
    }

    get filteredItems(): ObservableArray<any> {
        return this.get("_filteredItems");
    }
    set filteredItems(value: ObservableArray<any>) {
        this.set("_filteredItems", value);
    }
    has(value: string) {
        return this.items.indexOf(value) !== -1;
    }
    add(value: string) {
        console.log("add", this.key, value);
        this.items.push(value);
    }
    save() {
        appSettings.setString(this.savekey, this.toString());
    }
    toString() {
        return ObservableArrayToString(this.items);
    }

    saveCurrentValue = () => {
        console.log("saveCurrentValue tyr", this.key, this._value);
        const value = this._value.trim();
        console.log("saveCurrentValue", this.key, value);
        if (value.length > 3 && !this.has(value)) {
            this.add(value);
            this.save();
            console.log("added", this.key, value, this.toString());
        }
    };
    onTextFieldFocus = () => {
        // const value = this._textField.text.trim();
        if (this.filteredItems.length > 0) {
            this.parent.showPopup(this.textfield, this.key + "list");
        }
    };
    set textfield(value: TextField) {
        if (value) {
            this._textField = value;
            // this._textField.on(TextField.blurEvent, this.onTextFieldBlur);
            this._textField.on(TextField.focusEvent, this.onTextFieldFocus);
        }
    }
    get textfield() {
        return this._textField;
    }

    set value(value: string) {
        this._value = value;
        if (!value || value.length === 0) {
            this.filteredItems = new ObservableArray<object>();
        } else {
            this.updateFilteredTerm(value);
        }
    }
    get value() {
        return this._value;
    }

    updateFilteredTerm(term: string) {
        if (this.items.length === 0) {
            return;
        }
        var result = this.items
            .filter(function(item) {
                return item && item.toLowerCase() !== term.toLowerCase() && item.toLowerCase().indexOf(term.toLowerCase()) > -1;
            })
            .map(s => {
                return { name: s };
            });
        this.filteredItems = new ObservableArray(result);
        if (this.filteredItems.length > 0) {
            this.parent.showPopup(this.textfield, this.key + "list");
        } else {
            this.parent.hidePopup();
        }
    }
}

export class Model extends Observable {
    private barcodeScanner: BarcodeScanner;
    private popup: Popup;
    // _recipient: string
    // _deliverer: string
    clerkTextField: TextField;
    receiving_clerk: string;
    recipientList: FilteredList;
    delivererList: FilteredList;
    scans = new ObservableArray<any>();
    pendingScans = new ObservableArray<any>();
    signatureImage: Image;
    constructor() {
        super();
        this.recipientList = new FilteredList("recipient", this);
        this.delivererList = new FilteredList("deliverer", this);
        let scans: string[] = JSON.parse(appSettings.getString("scans") || "[]");
        scans.forEach(s => this.scans.push(s));
        this.barcodeScanner = new BarcodeScanner();
    }

    get recipientItems() {
        return this.recipientList.items;
    }

    get filteredRecipientItems() {
        return this.recipientList.filteredItems;
    }

    get deliverer() {
        return this.delivererList.value;
    }

    set deliverer(value: string) {
        this.delivererList.value = value.trim();
    }

    set delivererTextField(value: TextField) {
        this.delivererList.textfield = value;
    }
    get delivererTextField() {
        return this.delivererList.textfield;
    }

    get delivererItems() {
        return this.delivererList.items;
    }

    get filteredDelivererItems() {
        return this.delivererList.filteredItems;
    }

    get recipient() {
        return this.recipientList.value;
    }

    set recipient(value: string) {
        this.recipientList.value = value.trim();
    }

    set recipientTextField(value: TextField) {
        this.recipientList.textfield = value;
    }
    get recipientTextField() {
        return this.recipientList.textfield;
    }

    doContinuousScan = () => {
        if (!this.recipient || this.recipient.length === 0) {
            return alert(localize("please_enter_recipient"));
        }
        if (!this.deliverer || this.deliverer.length === 0) {
            return alert(localize("please_enter_deliverer"));
        }
        this.barcodeScanner.scan({
            reportDuplicates: false,
            continuousScanCallback: result => {
                console.log(`${result.format}: ${result.text} @ ${new Date().getTime()}`);
                this.pendingScans.push({
                    text: result.text,
                    timestamp: Date.now()
                });
                vibrator.vibrate(500);
            },
            closeCallback: () => {
                console.log("Scanner closed @ " + new Date().getTime());
                this.clerkTextField.focus();
                if (device.os === platformNames.android) {
                    console.log("about to show keyboard");
                    utils.ad.showSoftInput(this.clerkTextField);
                }
            }
        });
    };

    // private scan(front: boolean, flip: boolean, torch?: boolean, orientation?: string) {
    //     this.barcodeScanner
    //         .scan({
    //             formats: "QR_CODE, EAN_13, CODE_128",
    //             cancelLabel: "EXIT. Also, try the volume buttons!", // iOS only, default 'Close'
    //             cancelLabelBackgroundColor: "#333333", // iOS only, default '#000000' (black)
    //             message: "Use the volume buttons for extra light", // Android only, default is 'Place a barcode inside the viewfinder rectangle to scan it.'
    //             preferFrontCamera: front, // Android only, default false
    //             showFlipCameraButton: flip, // default false
    //             showTorchButton: torch, // iOS only, default false
    //             torchOn: false, // launch with the flashlight on (default false)
    //             resultDisplayDuration: 500, // Android only, default 1500 (ms), set to 0 to disable echoing the scanned text
    //             orientation: orientation, // Android only, default undefined (sensor-driven orientation), other options: portrait|landscape
    //             beepOnScan: true, // Play or Suppress beep on scan (default true)
    //             openSettingsIfPermissionWasPreviouslyDenied: true, // On iOS you can send the user to the settings app if access was previously denied
    //             closeCallback: () => {
    //                 console.log("Scanner closed @ " + new Date().getTime());
    //             }
    //         })
    //         .then(
    //             function(result) {
    //                 console.log("--- scanned: " + result.text);
    //                 // Note that this Promise is never invoked when a 'continuousScanCallback' function is provided
    //                 setTimeout(function() {
    //                     // if this alert doesn't show up please upgrade to {N} 2.4.0+
    //                     alert({
    //                         title: "Scan result",
    //                         message: "Format: " + result.format + ",\nValue: " + result.text,
    //                         okButtonText: "OK"
    //                     });
    //                 }, 500);
    //             },
    //             function(errorMessage) {
    //                 console.log("No scan. " + errorMessage);
    //             }
    //         );
    // }

    public doSign(args) {
        if (this.pendingScans.length === 0) {
            return alert(localize("no_scans"));
        }
        if (!this.receiving_clerk || this.receiving_clerk.length === 0) {
            return alert(localize("please_enter_receiving_clerk"));
        }
        const page = <Page>args.object.page;
        // const label = page.getViewById<Label>("label");
        // var fullscreen = (<any>args.object).text.indexOf("(full-screen)") !== -1;
        page.showModal(
            "signature/page",
            "context",
            (err, image) => {
                console.log("onSignature", err, image);
                if (image) {
                    const img = imageSource.fromNativeSource(image);
                    this.signatureImage.imageSource = img;
                    const folder = fs.knownFolders.documents();
                    const path = fs.path.join(folder.path, "signature_" + Date.now() + ".png");
                    const saved = img.saveToFile(path, "png");
                    if (this.pendingScans.length > 0) {
                        this.pendingScans.forEach((s, index) => {
                            s.signature = path;
                            s.recipient = this.recipient;
                            s.deliverer = this.deliverer;
                            s.receiving_clerk = this.receiving_clerk;
                            this.scans.push(s);
                        });
                        appSettings.setString("scans", ObservableArrayToString(this.scans));
                        while (this.pendingScans.length) {
                            this.pendingScans.pop();
                        }
                        vibrator.vibrate(1000);
                    }
                    //save the current entries to present them in a popup on next try
                    this.delivererList.saveCurrentValue();
                    this.recipientList.saveCurrentValue();

                    // clean up fields
                    this.recipient = null;
                    this.receiving_clerk = null;
                } else {
                    this.signatureImage.imageSource = null;
                }
                page.closeModal();
                // label.text = username + "/" + password;
            },
            false
        );
    }

    recipientItemTap(args: ItemEventData) {
        this.recipient = this.recipientTextField.text = this.filteredRecipientItems.getItem(args.index).name;
    }
    delivererItemTap(args: ItemEventData) {
        this.deliverer = this.delivererTextField.text = this.filteredDelivererItems.getItem(args.index).name;
    }

    popupVisible = false;
    showPopup(source, view) {
        console.log("showPopup", this.popupVisible, source, view);
        if (this.popupVisible) {
            return;
        }
        this.popupVisible = true;
        if (!this.popup) {
            this.popup = new Popup({
                height: 20,
                width: 80,
                unit: "%",
                elevation: 10,
                borderRadius: 2
            });
            // ((this.popup as any)._popup as android.widget.PopupWindow).setHeight(android.view.ViewGroup.LayoutParams.WRAP_CONTENT);
        }

        const listPath = fs.path.join(fs.knownFolders.currentApp().path, "/template/" + view + ".xml");
        const component = builder.load(listPath);
        component.bindingContext = this;

        this.popup.showPopup(source, component).then(data => {
            console.log("popup done", data);
            this.popupVisible = false;
        });
    }
    hidePopup(index?) {
        if (!this.popupVisible) {
            return;
        }
        console.log("hidepopup");
        this.popupVisible = false;
        this.popup.hidePopup(index);
    }

    exportScans() {
        if (this.scans.length === 0) {
            return;
        }
        let fileName = `export_${new Date().valueOf()}.csv`;
        let documents = fs.knownFolders.documents();
        let thePath = fs.path.join(documents.path, fileName);

        let testString = "date;destinataire;scan;livreur;receptionnaire;signature;";
        this.scans.forEach(scan => {
            testString += `\n${moment(scan.timestamp).format('LLL')};${scan.recipient};${scan.text};${scan.deliverer};${scan.receiving_clerk};${imageSource.fromFile(scan.signature).toBase64String('png')};`
        });
        let file = fs.File.fromPath(thePath);
        file.writeTextSync(testString);
        let shareFile = new ShareFile();
        shareFile.open({
            path: thePath,
            intentTitle: "Share csv file with:", // optional Android
            rect: {
                // optional iPad
                x: 110,
                y: 110,
                width: 0,
                height: 0
            },
            options: true, // optional iOS
            animated: true // optional iOS
        });
    }
}
