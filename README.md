# Gmail Under List Pagination

Adds working **Newer** / **Older** paging buttons under every Gmail email list — including each pane when Gmail's "Multiple inboxes" feature is enabled.

## Install

(For the moment this extension can not be installed from the Chrome Web Store; to make that happen would be quite a bit more work in comparison to the little work I've put in so far.)

1. Clone this repository.
2. Open `chrome://extensions/` in Chrome / Brave / ?.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the repository directory.
5. Open Gmail (`https://mail.google.com/`). Pagination info and buttons should appear under each list.

After editing source files, click the **reload** icon for the extension card and reload the Gmail tab.

## Supported locales

The extension finds Gmail's existing Newer/Older arrows by their localized `data-tooltip` text. Supported locales:

- English (`en`): "Newer" / "Older"
- Dutch (`nl`): "Nieuwer" / "Ouder"

If Gmail is in another language, no footer is injected. Add the locale to `LOCALE_TOOLTIPS` in `src/content.js` to extend support.

## Privacy

For the sake of completenesss: of course this extension does not read your e-mail messages.

## Coding Agent Disclaimer

Claude Code wrote all code.
(In this case I clearly cared more about outcome than about the code itself.)
I have tested that it works for me and have scanned the code to see that I understand enough of the approach and nothing undesirable is going on.
I actively use it (although I would prefer infinite scrolling for an improved user experience).
