<?xml version="1.0" encoding="UTF-8"?>
<p:library xmlns:p="http://www.w3.org/ns/xproc" version="1.0"
           xmlns:px="http://www.daisy.org/ns/pipeline/xproc"
           xmlns:pxi="http://www.daisy.org/ns/pipeline/xproc/internal">

    <p:declare-step type="px:epub-to-webbook" name="main">
        <p:option name="source" required="true"/>
        <p:option name="result" required="true"/>
        <p:option name="include-non-linear" select="'false'"/>
        <p:option name="identifier" select="''"/>

        <p:declare-step type="pxi:epub-to-webbook">
            <p:option name="source" required="true"/>
            <p:option name="result" required="true"/>
            <p:option name="include-non-linear" required="true"/>
            <p:option name="identifier" required="true"/>
        </p:declare-step>

        <pxi:epub-to-webbook>
            <p:with-option name="source" select="$source"/>
            <p:with-option name="result" select="$result"/>
            <p:with-option name="include-non-linear" select="$include-non-linear"/>
            <p:with-option name="identifier" select="$identifier"/>
        </pxi:epub-to-webbook>
    </p:declare-step>
</p:library>
