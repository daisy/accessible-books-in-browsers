<?xml version="1.0" encoding="UTF-8"?>
<p:library xmlns:p="http://www.w3.org/ns/xproc" version="1.0"
           xmlns:px="http://www.daisy.org/ns/pipeline/xproc"
           xmlns:pxi="http://www.daisy.org/ns/pipeline/xproc/internal">

    <p:declare-step type="px:xml-node-roundtrip" name="main">
        <p:input port="source" primary="true"/>
        <p:output port="result" primary="true">
            <p:pipe step="transform" port="result"/>
        </p:output>

        <p:declare-step type="pxi:xml-node-roundtrip">
            <p:input port="source" primary="true"/>
            <p:output port="result" primary="true"/>
        </p:declare-step>

        <pxi:xml-node-roundtrip name="transform"/>
    </p:declare-step>
</p:library>
