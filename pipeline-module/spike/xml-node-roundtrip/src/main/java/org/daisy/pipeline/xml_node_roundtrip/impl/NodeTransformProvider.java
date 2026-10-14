package org.daisy.pipeline.xml_node_roundtrip.impl;

import java.io.File;
import java.io.FileOutputStream;
import java.util.Map;

import javax.xml.transform.stream.StreamSource;

import com.xmlcalabash.core.XProcRuntime;
import com.xmlcalabash.io.ReadablePipe;
import com.xmlcalabash.io.WritablePipe;
import com.xmlcalabash.library.DefaultStep;
import com.xmlcalabash.runtime.XAtomicStep;

import net.sf.saxon.s9api.SaxonApiException;
import net.sf.saxon.s9api.Serializer;
import net.sf.saxon.s9api.XdmNode;

import org.daisy.common.xproc.XProcMonitor;
import org.daisy.common.xproc.calabash.XProcStep;
import org.daisy.common.xproc.calabash.XProcStepProvider;
import org.daisy.pipeline.xml_node_roundtrip.NodeTransformRunner;

import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;

@Component(
	name = "xml-node-roundtrip-step",
	service = { XProcStepProvider.class },
	property = { "type:String={http://www.daisy.org/ns/pipeline/xproc/internal}xml-node-roundtrip" }
)
public class NodeTransformProvider implements XProcStepProvider {

	private NodeTransformRunner nodeTransform;

	@Activate
	public void init() {
		nodeTransform = new NodeTransformRunner();
	}

	@Override
	public XProcStep newStep(XProcRuntime runtime, XAtomicStep step, XProcMonitor monitor,
	                         Map<String,String> properties) {
		return new NodeTransformStep(runtime, step, nodeTransform);
	}

	private static final class NodeTransformStep extends DefaultStep implements XProcStep {

		private final NodeTransformRunner nodeTransform;
		private ReadablePipe source;
		private WritablePipe result;

		private NodeTransformStep(XProcRuntime runtime, XAtomicStep step,
		                          NodeTransformRunner nodeTransform) {
			super(runtime, step);
			this.nodeTransform = nodeTransform;
		}

		@Override
		public void setInput(String port, ReadablePipe pipe) {
			source = pipe;
		}

		@Override
		public void setOutput(String port, WritablePipe pipe) {
			result = pipe;
		}

		@Override
		public void reset() {
			source.resetReader();
			result.resetWriter();
		}

		@Override
		public void run() throws SaxonApiException {
			super.run();
			File input = null;
			File output = null;
			try {
				input = File.createTempFile("xml-node-roundtrip-input-", ".xml");
				output = File.createTempFile("xml-node-roundtrip-output-", ".xml");

				XdmNode document = source.read();
				Serializer serializer = runtime.getProcessor().newSerializer();
				try (FileOutputStream stream = new FileOutputStream(input)) {
					serializer.setOutputStream(stream);
					serializer.serializeNode(document);
				}

				nodeTransform.transform(input, output);
				XdmNode transformed = runtime.getProcessor().newDocumentBuilder()
					.build(new StreamSource(output));
				result.write(transformed);
			} catch (Throwable e) {
				throw XProcStep.raiseError(e, step);
			} finally {
				if (input != null)
					input.delete();
				if (output != null)
					output.delete();
			}
		}
	}
}
