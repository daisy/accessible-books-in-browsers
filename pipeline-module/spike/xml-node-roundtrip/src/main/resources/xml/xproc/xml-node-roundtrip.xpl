<?xml version="1.0" encoding="UTF-8"?>
<p:declare-step type="px:xml-node-roundtrip.script" version="1.0"
                xmlns:p="http://www.w3.org/ns/xproc"
                xmlns:px="http://www.daisy.org/ns/pipeline/xproc"
                exclude-inline-prefixes="#all"
                name="main">

    <p:documentation xmlns="http://www.w3.org/1999/xhtml">
        <h1 px:role="name">XML Node round-trip</h1>
        <p px:role="desc">Passes an XML document through a Node.js transform and returns it.</p>
    </p:documentation>

    <p:input port="source" primary="true" px:media-type="application/xml"/>
    <p:output port="result" primary="true" px:media-type="application/xml">
        <p:pipe step="transform" port="result"/>
    </p:output>

    <p:import href="library.xpl"/>

    <px:xml-node-roundtrip name="transform"/>
</p:declare-step>
