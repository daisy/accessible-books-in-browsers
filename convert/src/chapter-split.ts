export type TocFragmentTarget = {
    depth: number;
    fragment: string;
    title: string;
};

export type DocumentSplitPlan = {
    cutIds: string[];
    cutTitles: string[];
    depth: number;
    leading: boolean;
    pieces: number;
};

const NON_TEXT_CONTENT = 'img, svg, table, math, figure, audio, video';

function ensureHeadingIds(doc: Document): void {
    Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6')).forEach((heading, index) => {
        if (!heading.id) heading.id = heading.getAttribute('data-number') || `h-${index}`;
    });
}

function planDocumentSplit(
    doc: Document,
    targets: TocFragmentTarget[],
    warn: (message: string) => void = () => {}
): DocumentSplitPlan | undefined {
    const depths = Array.from(new Set(targets.map(target => target.depth))).sort((a, b) => a - b);
    const depth = depths.find(candidate => targets.filter(target => target.depth === candidate).length >= 2);
    if (depth === undefined) return undefined;

    const cutIds: string[] = [];
    const cutTitles: string[] = [];
    let previousTarget: Element | null = null;
    for (const target of targets.filter(candidate => candidate.depth === depth)) {
        const element = doc.getElementById(target.fragment);
        if (!element) {
            warn(`Ignoring table of contents target #${target.fragment}: no matching element`);
            continue;
        }
        if (previousTarget === element) {
            warn(`Ignoring repeated table of contents target #${target.fragment}`);
            continue;
        }
        if (previousTarget && !(previousTarget.compareDocumentPosition(element) & 4)) {
            warn(`Ignoring out-of-order table of contents target #${target.fragment}`);
            continue;
        }
        cutIds.push(target.fragment);
        cutTitles.push(target.title);
        previousTarget = element;
    }
    if (cutIds.length < 2) return undefined;

    const boundaries = splitBoundaries(doc, cutIds);
    const leading = hasMeaningfulRange(doc, null, boundaries[0]);
    return {
        cutIds,
        cutTitles,
        depth,
        leading,
        pieces: cutIds.length + (leading ? 1 : 0)
    };
}

function extractDocumentPiece(doc: Document, plan: DocumentSplitPlan, piece: number): Document {
    const body = doc.body;
    const boundaries = splitBoundaries(doc, plan.cutIds);
    const startIndex = piece === 0 ? -1 : piece - (plan.leading ? 1 : 0);
    const endIndex = piece + (plan.leading ? 0 : 1);
    const start = startIndex >= 0 ? boundaries[startIndex] : null;
    const end = endIndex < boundaries.length ? boundaries[endIndex] : null;
    const range = doc.createRange();
    range.selectNodeContents(body);
    if (start) range.setStartBefore(start);
    if (end) range.setEndBefore(end);
    const content = range.cloneContents();
    body.replaceChildren(content);
    if (piece > 0) body.removeAttribute('id');
    return doc;
}

function pieceForElement(doc: Document, plan: DocumentSplitPlan, element: Element): number {
    const boundaries = splitBoundaries(doc, plan.cutIds);
    let passed = 0;
    for (const boundary of boundaries) {
        if (boundary === element || boundary.compareDocumentPosition(element) & 4) passed += 1;
    }
    return plan.leading ? passed : Math.max(0, passed - 1);
}

function titleForPiece(plan: DocumentSplitPlan, piece: number): string {
    const cutIndex = plan.leading ? piece - 1 : piece;
    return cutIndex >= 0 ? plan.cutTitles[cutIndex] ?? '' : '';
}

function removeIdsNotOwnedByPage(
    doc: Document,
    sourcePath: string,
    outputFilename: string,
    idToOutput: Map<string, string>
): void {
    doc.querySelectorAll('[id]').forEach(element => {
        const output = idToOutput.get(`${sourcePath}#${element.id}`);
        if (output && output !== outputFilename) element.removeAttribute('id');
    });
}

function splitBoundaries(doc: Document, cutIds: string[]): Element[] {
    const boundaries: Element[] = [];
    let previousTarget: Element | null = null;
    for (const id of cutIds) {
        const target = doc.getElementById(id);
        if (!target) throw new Error(`Split target #${id} is missing`);
        boundaries.push(liftBoundary(target, previousTarget, doc.body));
        previousTarget = target;
    }
    return boundaries;
}

function liftBoundary(target: Element, previousTarget: Element | null, body: HTMLElement): Element {
    let boundary = target;
    while (boundary.parentElement && boundary.parentElement !== body) {
        const parent = boundary.parentElement;
        if (previousTarget && parent.contains(previousTarget)) break;
        if (hasMeaningfulSiblingsBefore(boundary)) break;
        boundary = parent;
    }
    return boundary;
}

function hasMeaningfulSiblingsBefore(node: Element): boolean {
    let sibling: ChildNode | null = node.previousSibling;
    while (sibling) {
        if (hasRealContent(sibling)) return true;
        sibling = sibling.previousSibling;
    }
    return false;
}

function hasMeaningfulRange(doc: Document, start: Element | null, end: Element | null): boolean {
    const range = doc.createRange();
    range.selectNodeContents(doc.body);
    if (start) range.setStartBefore(start);
    if (end) range.setEndBefore(end);
    return hasRealContent(range.cloneContents());
}

function hasRealContent(node: Node): boolean {
    if ((node.textContent ?? '').trim()) return true;
    if (node.nodeType === 1 && (node as Element).matches(NON_TEXT_CONTENT)) return true;
    if ('querySelector' in node && typeof node.querySelector === 'function') {
        return Boolean(node.querySelector(NON_TEXT_CONTENT));
    }
    return false;
}

export {
    ensureHeadingIds,
    extractDocumentPiece,
    hasRealContent,
    pieceForElement,
    planDocumentSplit,
    removeIdsNotOwnedByPage,
    titleForPiece
};
