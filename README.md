# accessible-books-on-the-web

<!-- ## Demo

* [Action for Heroes](https://daisy.github.io/accessible-books-on-the-web/demos/action_for_heroes_epub) -->

This is a prototype project to transform EPUB with Media Overlays into a series of HTML files suitable for reading on the web. The reading controls are embedded into the HTML files themselves.

Current features



| Feature | Basic | JS-enhanced |
|---------|-------|-------------|
| Spine navigation | Forward and back through the spine documents with links (shown as arrows) | (same) | 
| TOC | TOC link opens `nav.html`| Loads TOC in sidebar | 
| Page list | Page list is within `nav.html`, use landmarks navigation or click the in-page link at top | Loads in sidebar and has go-to-page controls | 
| Search | Not available | Full text search from sidebar |
| Publication info | Info link opens `about.html`, a generated page containing publication info | Loads in sidebar |
| Keyboard shortcuts | Not available | Available (see help for details) | 
| Help | Opens in new page | (same) |
| Settings | Not available | Change size, theme, playback rate |
| Theme | Match OS theme by default | (same) |
| Bookmarks | Bookmark any heading using your browser | (same) |
| Audio support | Play embedded audio for the page with native HTML controls | Synchronized highlighting and custom controls, including phrase navigation|


