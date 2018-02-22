
export function hideSoftKeyboard(view: android.view.View) {
    showSoftKeyboard(view, false);
}

/**
 * Shows/hides the soft keyboard.
 * @param view the current focused view.
 * @param show whether to show soft keyboard.
 */
export function showSoftKeyboard(view: android.view.View, show) {
    if (view == null) return;
    var imm: android.view.inputmethod.InputMethodManager = view.getContext().getSystemService(android.app.Activity.INPUT_METHOD_SERVICE);

    if (imm != null) {
        var useForce = true;
        if (show) {
            imm.showSoftInput(view, useForce ? android.view.inputmethod.InputMethodManager.SHOW_FORCED : android.view.inputmethod.InputMethodManager.SHOW_IMPLICIT);
        } else {
            imm.hideSoftInputFromWindow(view.getWindowToken(), useForce ? 0 : android.view.inputmethod.InputMethodManager.HIDE_IMPLICIT_ONLY);
        }
    }
}
export function setFocusable(view: android.view.View, focusable) {
    view.setFocusable(focusable);
    // so dumb setFocusable to false set setFocusableInTouchMode
    // but not when using true :s so we have to do it
    view.setFocusableInTouchMode(focusable);
}
export function handleClearFocus(view: android.view.View) {
    var root: android.view.View = view.getRootView();
    var oldValue = true;
    var oldDesc = android.view.ViewGroup.FOCUS_BEFORE_DESCENDANTS;

    if (root != null) {
        if (root instanceof android.view.ViewGroup) {
            oldDesc = (root as android.view.ViewGroup).getDescendantFocusability();
            (root as android.view.ViewGroup).setDescendantFocusability(android.view.ViewGroup.FOCUS_BLOCK_DESCENDANTS);
        }
        oldValue = root.isFocusable();
        setFocusable(root, false);
    }
    view.clearFocus();
    if (root != null) {
        setFocusable(root, oldValue);
        if (root instanceof android.view.ViewGroup) {
            (root as android.view.ViewGroup).setDescendantFocusability(oldDesc);
        }
    }

    hideSoftKeyboard(view);
}