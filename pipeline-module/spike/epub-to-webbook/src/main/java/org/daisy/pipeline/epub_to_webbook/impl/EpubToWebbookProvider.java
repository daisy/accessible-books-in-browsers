package org.daisy.pipeline.epub_to_webbook.impl;

import java.io.File;
import java.net.URI;
import java.util.Map;

import com.xmlcalabash.core.XProcRuntime;
import com.xmlcalabash.library.DefaultStep;
import com.xmlcalabash.runtime.XAtomicStep;

import net.sf.saxon.s9api.QName;
import net.sf.saxon.s9api.SaxonApiException;

import org.daisy.common.xproc.XProcMonitor;
import org.daisy.common.xproc.calabash.XProcStep;
import org.daisy.common.xproc.calabash.XProcStepProvider;
import org.daisy.pipeline.epub_to_webbook.EpubToWebbookRunner;

import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;

@Component(
	name = "epub-to-webbook-step",
	service = { XProcStepProvider.class },
	property = { "type:String={http://www.daisy.org/ns/pipeline/xproc/internal}epub-to-webbook" }
)
public class EpubToWebbookProvider implements XProcStepProvider {

	private EpubToWebbookRunner converter;

	@Activate
	public void init() {
		converter = new EpubToWebbookRunner();
	}

	@Override
	public XProcStep newStep(XProcRuntime runtime, XAtomicStep step, XProcMonitor monitor,
	                         Map<String,String> properties) {
		return new EpubToWebbookStep(runtime, step, converter);
	}

	private static final class EpubToWebbookStep extends DefaultStep implements XProcStep {

		private static final QName _source = new QName("source");
		private static final QName _result = new QName("result");
		private static final QName _includeNonLinear = new QName("include-non-linear");
		private static final QName _identifier = new QName("identifier");

		private final EpubToWebbookRunner converter;

		private EpubToWebbookStep(XProcRuntime runtime, XAtomicStep step,
		                          EpubToWebbookRunner converter) {
			super(runtime, step);
			this.converter = converter;
		}

		@Override
		public void reset() {
			// This step has no ports or per-run state to reset.
		}

		@Override
		public void run() throws SaxonApiException {
			super.run();
			try {
				File source = new File(new URI(getOption(_source).getString()));
				File result = new File(new URI(getOption(_result).getString()));
				boolean includeNonLinear = getOption(_includeNonLinear).getBoolean();
				String identifier = getOption(_identifier, "");
				converter.convert(source, result, includeNonLinear, identifier);
			} catch (Throwable e) {
				throw XProcStep.raiseError(e, step);
			}
		}
	}
}
