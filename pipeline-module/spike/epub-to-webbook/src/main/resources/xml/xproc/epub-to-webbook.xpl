<?xml version="1.0" encoding="UTF-8"?>
<p:declare-step type="px:epub-to-webbook.script" version="1.0"
                xmlns:p="http://www.w3.org/ns/xproc"
                xmlns:px="http://www.daisy.org/ns/pipeline/xproc"
                exclude-inline-prefixes="#all"
                name="main"
                px:input-filesets="epub2 epub3">

    <p:documentation xmlns="http://www.w3.org/1999/xhtml">
        <h1 px:role="name">EPUB to web book</h1>
        <p px:role="desc">Converts an EPUB publication into a self-contained web book.</p>
    </p:documentation>

    <p:option name="source" required="true" px:type="anyFileURI" px:media-type="application/epub+zip">
        <p:documentation xmlns="http://www.w3.org/1999/xhtml">
            <h2 px:role="name">Input EPUB</h2>
            <p px:role="desc">The EPUB publication to convert.</p>
        </p:documentation>
    </p:option>

    <p:option name="result" required="true" px:output="result" px:type="anyDirURI">
        <p:documentation xmlns="http://www.w3.org/1999/xhtml">
            <h2 px:role="name">Web book</h2>
            <p px:role="desc">Directory where the converted web book will be written.</p>
        </p:documentation>
    </p:option>

    <p:option name="include-non-linear" select="'false'" px:type="boolean">
        <p:documentation xmlns="http://www.w3.org/1999/xhtml">
            <h2 px:role="name">Include non-linear content</h2>
            <p px:role="desc">Include spine items marked linear="no" in the reading order.</p>
        </p:documentation>
    </p:option>

    <p:option name="identifier" select="''" px:type="string">
        <p:documentation xmlns="http://www.w3.org/1999/xhtml">
            <h2 px:role="name">Identifier</h2>
            <p px:role="desc">Book ID used to key saved reading positions. Leave empty to use the EPUB's identifier.</p>
        </p:documentation>
    </p:option>

    <p:import href="library.xpl"/>

    <px:epub-to-webbook>
        <p:with-option name="source" select="$source"/>
        <p:with-option name="result" select="$result"/>
        <p:with-option name="include-non-linear" select="$include-non-linear"/>
        <p:with-option name="identifier" select="$identifier"/>
    </px:epub-to-webbook>
</p:declare-step>
