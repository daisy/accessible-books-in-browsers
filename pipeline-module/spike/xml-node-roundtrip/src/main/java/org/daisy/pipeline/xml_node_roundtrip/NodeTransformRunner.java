package org.daisy.pipeline.xml_node_roundtrip;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;

import org.daisy.common.shell.BinaryFinder;
import org.daisy.common.shell.CommandRunner;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class NodeTransformRunner {

	private static final Logger LOGGER = LoggerFactory.getLogger(NodeTransformRunner.class);
	private static final String SCRIPT_PROPERTY = "xml-node-roundtrip.script";
	private static final String SCRIPT_ENV = "XML_NODE_ROUNDTRIP_SCRIPT";

	private final File node;
	private final File script;

	public NodeTransformRunner() {
		this.node = new File(BinaryFinder.find("node").orElseThrow(
			() -> new NoSuchElementException("Node.js was not found on PATH")));
		this.script = findScript();
	}

	public void transform(File input, File output) throws Throwable {
		List<String> command = new ArrayList<>();
		command.add(node.getAbsolutePath());
		command.add(script.getAbsolutePath());
		command.add(input.getAbsolutePath());
		command.add(output.getAbsolutePath());
		new CommandRunner(command).consumeError(LOGGER).run();
	}

	private static File findScript() {
		String configured = System.getProperty(SCRIPT_PROPERTY);
		if (configured == null || configured.trim().isEmpty())
			configured = System.getenv(SCRIPT_ENV);
		File script = configured == null || configured.trim().isEmpty()
			? new File("../node-transform/build/index.js")
			: new File(configured);
		if (!script.isFile())
			throw new IllegalStateException(
				"Node transform script not found at " + script.getAbsolutePath()
				+ "; set -D" + SCRIPT_PROPERTY + " or " + SCRIPT_ENV);
		return script;
	}
}
