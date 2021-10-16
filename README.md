# accessible-books-on-the-web

## Demos

* [Action for Heroes](https://daisy.github.io/accessible-books-on-the-web/demos/action-for-heroes)
* [Moby Dick](https://daisy.github.io/accessible-books-on-the-web/demos/moby-dick)

## Status

Creation of the demos here was entirely automated, using the `convert` script, starting from an EPUB fileset. The script and UI are both in the exploratory stages of development.

Many features are still experimental or on the to-do list (such as mobile layout). Current features are detailed below.

## About 
Transform EPUB with Media Overlays into a series of HTML files suitable for reading on the web. In this approach, the reading controls are embedded into the HTML files themselves. There are two parts: 
* the transformation script: `convert`
* the UI: `demos/src`

## Current features

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



