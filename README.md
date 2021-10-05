# books-in-browsers

## Demo

[Action for Heroes (text)](https://daisy.github.io/books-in-browsers/demos/action-for-heroes/index.html)
[Moby Dick (text + audio for chapters 1 and 2)](https://daisy.github.io/books-in-browsers/demos/mobydick/index.html)

Current features: 

* Sidebar with TOC, landmarks, pages, search prototype, and publication info
* Previous/next spine item controls
* Keyboard shortcuts
* Help information
* Settings (dark mode, font size), including support for CSS @prefers-color-scheme, to automatically match the user's OS preference for dark mode.
* Bookmark any heading using the browser's built-in bookmarking
* Synchronized text + audio support (even without JS you can listen to the audio file)

Note that many of the above features are possible without any JS support. The reading experience gracefully degrades even on older devices and slower connections. 

Future iterations will add:

* Full text searching
* Mobile layout improvements
* Fine tune dark mode synchronization with OS prefs
* Testing across browsers