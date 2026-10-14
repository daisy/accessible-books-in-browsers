package org.daisy.pipeline.epub_to_webbook;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;

import org.daisy.common.shell.BinaryFinder;
import org.daisy.common.shell.CommandRunner;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class EpubToWebbookRunner {

	private static final Logger LOGGER = LoggerFactory.getLogger(EpubToWebbookRunner.class);

	private final File node;
	private final File converterScript;
	private final File template;

	public EpubToWebbookRunner() {
		node = new File(BinaryFinder.find("node").orElseThrow(
			() -> new NoSuchElementException("Node.js was not found on PATH")));
		converterScript = configuredFile(
			"epub-to-webbook.converter-script",
			"WEBBOOK_CONVERTER_SCRIPT",
			"../../../convert/build/index.js");
		template = configuredDirectory(
			"epub-to-webbook.template",
			"WEBBOOK_CONVERTER_TEMPLATE",
			"../../../convert/template");
	}

	public void convert(File source, File result, boolean includeNonLinear, String identifier) throws Throwable {
		List<String> command = new ArrayList<>();
		command.add(node.getAbsolutePath());
		command.add(converterScript.getAbsolutePath());
		command.add("convert");
		command.add(source.getAbsolutePath());
		command.add(result.getAbsolutePath());
		command.add(template.getAbsolutePath());
		if (includeNonLinear)
			command.add("--include-non-linear");
		if (identifier != null && !identifier.trim().isEmpty()) {
			command.add("--identifier");
			command.add(identifier.trim());
		}
		new CommandRunner(command).consumeError(LOGGER).run();
	}

	private static File configuredFile(String property, String environment, String fallback) {
		File file = configuredPath(property, environment, fallback);
		if (!file.isFile())
			throw new IllegalStateException("File not found at " + file.getAbsolutePath()
				+ "; set -D" + property + " or " + environment);
		return file;
	}

	private static File configuredDirectory(String property, String environment, String fallback) {
		File directory = configuredPath(property, environment, fallback);
		if (!directory.isDirectory())
			throw new IllegalStateException("Directory not found at " + directory.getAbsolutePath()
				+ "; set -D" + property + " or " + environment);
		return directory;
	}

	private static File configuredPath(String property, String environment, String fallback) {
		String configured = System.getProperty(property);
		if (configured == null || configured.trim().isEmpty())
			configured = System.getenv(environment);
		return new File(configured == null || configured.trim().isEmpty() ? fallback : configured);
	}
}
