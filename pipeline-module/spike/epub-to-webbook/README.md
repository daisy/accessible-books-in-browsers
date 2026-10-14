# EPUB to web book Pipeline spike

This DAISY Pipeline 2 script invokes the existing `convert/` Node CLI. It intentionally does not
bundle Node, npm dependencies, the converter, its template, or FFmpeg yet.

Build the converter and module:

```sh
cd convert
npm ci
npm run build

cd ../pipeline-module/spike/epub-to-webbook
mvn --settings /path/to/pipeline/assembly/.mvn/settings.xml clean package -DskipTests
```

Install `target/epub-to-webbook-0.0.1-SNAPSHOT.jar` in the Pipeline distribution's `modules/`
directory. Before starting Pipeline, point the adapter at the checkout:

```sh
export WEBBOOK_CONVERTER_SCRIPT=/path/to/accessible-books-in-browsers/convert/build/index.js
export WEBBOOK_CONVERTER_TEMPLATE=/path/to/accessible-books-in-browsers/convert/template
```

The converter resolves its JavaScript packages, including the platform-specific FFmpeg and
FFprobe installers, from `convert/node_modules`. Node itself must be available on the Pipeline
process's `PATH`.
