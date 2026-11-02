(() => {
  // src/vendor/hypergraph-plotter/geom.js
  var Vec = {
    add: (v1, v2) => ({ x: v1.x + v2.x, y: v1.y + v2.y }),
    sub: (v1, v2) => ({ x: v1.x - v2.x, y: v1.y - v2.y }),
    mult: (v, s) => ({ x: v.x * s, y: v.y * s }),
    div: (v, s) => ({ x: v.x / s, y: v.y / s }),
    mag: (v) => Math.sqrt(v.x * v.x + v.y * v.y),
    dist: (v1, v2) => Math.sqrt((v1.x - v2.x) ** 2 + (v1.y - v2.y) ** 2),
    normalize: (v) => {
      const m = Math.sqrt(v.x * v.x + v.y * v.y);
      return m === 0 ? { x: 0, y: 0 } : { x: v.x / m, y: v.y / m };
    },
    limit: (v, max) => {
      const m = Math.sqrt(v.x * v.x + v.y * v.y);
      return m > max ? { x: v.x / m * max, y: v.y / m * max } : { ...v };
    }
  };
  function convexHull(points) {
    if (points.length <= 1) return [...points];
    const sorted = [...points].filter((p, i, self) => self.findIndex((o) => Math.abs(o.x - p.x) < 1e-5 && Math.abs(o.y - p.y) < 1e-5) === i).sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);
    if (sorted.length <= 2) return sorted;
    const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lower = [];
    for (let i = 0; i < sorted.length; i++) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], sorted[i]) <= 0) {
        lower.pop();
      }
      lower.push(sorted[i]);
    }
    const upper = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], sorted[i]) <= 0) {
        upper.pop();
      }
      upper.push(sorted[i]);
    }
    lower.pop();
    upper.pop();
    const hull = lower.concat(upper);
    let areaSum = 0;
    for (let i = 0; i < hull.length; i++) {
      const p1 = hull[i];
      const p2 = hull[(i + 1) % hull.length];
      areaSum += p1.x * p2.y - p2.x * p1.y;
    }
    if (areaSum < 0) {
      hull.reverse();
    }
    return hull;
  }
  function getBlobPath(points, radius) {
    if (!points || points.length === 0) return "";
    if (radius <= 0) radius = 10;
    const uniquePoints = points.filter(
      (p, i, self) => self.findIndex((o) => Math.abs(o.x - p.x) < 0.1 && Math.abs(o.y - p.y) < 0.1) === i
    );
    if (uniquePoints.length === 0) return "";
    if (uniquePoints.length === 1) {
      const p = uniquePoints[0];
      return `M ${p.x - radius} ${p.y} 
            A ${radius} ${radius} 0 1 0 ${p.x + radius} ${p.y} 
            A ${radius} ${radius} 0 1 0 ${p.x - radius} ${p.y} Z`;
    }
    if (uniquePoints.length === 2) {
      const p0 = uniquePoints[0];
      const p1 = uniquePoints[1];
      const d = Vec.dist(p0, p1);
      if (d < 0.1) {
        return getBlobPath([p0], radius);
      }
      const t = Vec.normalize(Vec.sub(p1, p0));
      const n2 = { x: t.y, y: -t.x };
      const p0_l = Vec.add(p0, Vec.mult(n2, radius));
      const p0_r = Vec.sub(p0, Vec.mult(n2, radius));
      const p1_l = Vec.add(p1, Vec.mult(n2, radius));
      const p1_r = Vec.sub(p1, Vec.mult(n2, radius));
      return `M ${p0_l.x} ${p0_l.y} 
            L ${p1_l.x} ${p1_l.y} 
            A ${radius} ${radius} 0 0 1 ${p1_r.x} ${p1_r.y} 
            L ${p0_r.x} ${p0_r.y} 
            A ${radius} ${radius} 0 0 1 ${p0_l.x} ${p0_l.y} Z`;
    }
    const hull = convexHull(uniquePoints);
    if (hull.length === 1) {
      return getBlobPath([hull[0]], radius);
    }
    if (hull.length === 2) {
      return getBlobPath([hull[0], hull[1]], radius);
    }
    const pathParts = [];
    const n = hull.length;
    for (let i = 0; i < n; i++) {
      const pCurr = hull[i];
      const pNext = hull[(i + 1) % n];
      const pPrev = hull[(i - 1 + n) % n];
      const vNext = Vec.sub(pNext, pCurr);
      const vPrev = Vec.sub(pCurr, pPrev);
      const tNext = Vec.normalize(vNext);
      const tPrev = Vec.normalize(vPrev);
      const nNext = { x: tNext.y, y: -tNext.x };
      const nPrev = { x: tPrev.y, y: -tPrev.x };
      const pStartOffset = Vec.add(pCurr, Vec.mult(nNext, radius));
      const pEndOffset = Vec.add(pCurr, Vec.mult(nPrev, radius));
      if (i === 0) {
        pathParts.push(`M ${pStartOffset.x} ${pStartOffset.y}`);
      } else {
        pathParts.push(`A ${radius} ${radius} 0 0 1 ${pStartOffset.x} ${pStartOffset.y}`);
      }
      const pNextStartOffset = Vec.add(pNext, Vec.mult(nNext, radius));
      pathParts.push(`L ${pNextStartOffset.x} ${pNextStartOffset.y}`);
    }
    const firstEdgeOffset = Vec.add(hull[0], Vec.mult({
      x: Vec.normalize(Vec.sub(hull[1], hull[0])).y,
      y: -Vec.normalize(Vec.sub(hull[1], hull[0])).x
    }, radius));
    pathParts.push(`A ${radius} ${radius} 0 0 1 ${firstEdgeOffset.x} ${firstEdgeOffset.y} Z`);
    return pathParts.join(" ");
  }

  // src/vendor/hypergraph-plotter/layout.js
  var BipartiteForceLayout = class {
    constructor(options = {}) {
      this.options = options;
      this.width = options.width || 800;
      this.height = options.height || 600;
      this.kAttract = options.kAttract !== void 0 ? options.kAttract : 0.2;
      this.kRepel = options.kRepel !== void 0 ? options.kRepel : 1e4;
      this.kHyperedgeRepel = options.kHyperedgeRepel !== void 0 ? options.kHyperedgeRepel : 1e4;
      this.kCenter = options.kCenter !== void 0 ? options.kCenter : 4e-3;
      this.restLength = options.restLength !== void 0 ? options.restLength : 0;
      this.componentSpacing = options.componentSpacing !== void 0 ? options.componentSpacing : 90;
      this.damping = options.damping !== void 0 ? options.damping : 0.88;
      this.maxSpeed = options.maxSpeed !== void 0 ? options.maxSpeed : 10;
      this.nodes = [];
      this.nodeMap = /* @__PURE__ */ new Map();
      this.links = [];
      this.draggedNodeId = null;
      this.fixedNodeIds = /* @__PURE__ */ new Set();
    }
    /**
     * Initializes or updates the simulation nodes and links.
     * If nodes already exist, we preserve their positions for a smooth transition.
     * @param {Array} vertices - List of vertex objects: { id, label }
     * @param {Array} hyperedges - List of hyperedges: { id, vertices: [vId1, vId2, ...] }
     * @param {Object} options - Visual styling/customization options (theme, fonts, sizes)
     */
    setGraph(vertices, hyperedges, options = {}) {
      this.options = { ...this.options, ...options };
      const oldNodeMap = new Map(this.nodes.map((n) => [n.id, n]));
      this.nodes = [];
      this.nodeMap.clear();
      this.links = [];
      const centerX = this.width / 2;
      const centerY = this.height / 2;
      const components = [];
      const visitedVertices = /* @__PURE__ */ new Set();
      const vertexMap = new Map(vertices.map((v) => [v.id, v]));
      const adj = /* @__PURE__ */ new Map();
      vertices.forEach((v) => adj.set(v.id, /* @__PURE__ */ new Set()));
      hyperedges.forEach((e) => {
        e.vertices.forEach((vId) => {
          if (adj.has(vId)) {
            adj.get(vId).add(e.id);
          }
        });
      });
      vertices.forEach((v) => {
        if (visitedVertices.has(v.id)) return;
        const compVertices = [];
        const compEdges = /* @__PURE__ */ new Set();
        const queue = [v.id];
        visitedVertices.add(v.id);
        while (queue.length > 0) {
          const currV = queue.shift();
          compVertices.push(currV);
          const edgeIds = adj.get(currV) || [];
          edgeIds.forEach((eId) => {
            compEdges.add(eId);
            const edge = hyperedges.find((e) => e.id === eId);
            if (edge) {
              edge.vertices.forEach((nextV) => {
                if (vertexMap.has(nextV) && !visitedVertices.has(nextV)) {
                  visitedVertices.add(nextV);
                  queue.push(nextV);
                }
              });
            }
          });
        }
        components.push({
          vertices: compVertices,
          edges: Array.from(compEdges)
        });
      });
      components.sort((a, b) => b.vertices.length - a.vertices.length);
      const nodeTargetCenters = /* @__PURE__ */ new Map();
      const numComponents = components.length;
      const R = this.componentSpacing > 0 ? this.componentSpacing : 150;
      components.forEach((comp, idx) => {
        const angle = numComponents <= 1 ? 0 : idx / numComponents * 2 * Math.PI;
        const spawnX = numComponents <= 1 ? centerX : centerX + R * Math.cos(angle);
        const spawnY = numComponents <= 1 ? centerY : centerY + R * Math.sin(angle);
        comp.vertices.forEach((vId) => nodeTargetCenters.set(vId, {
          spawnX,
          spawnY,
          targetX: centerX,
          targetY: centerY,
          componentId: idx
        }));
        comp.edges.forEach((eId) => nodeTargetCenters.set(`_hub_${eId}`, {
          spawnX,
          spawnY,
          targetX: centerX,
          targetY: centerY,
          componentId: idx
        }));
      });
      vertices.forEach((v) => {
        const oldNode = oldNodeMap.get(v.id);
        const target = nodeTargetCenters.get(v.id) || { spawnX: centerX, spawnY: centerY, targetX: centerX, targetY: centerY, componentId: 0 };
        const angle = Math.random() * 2 * Math.PI;
        const radius = numComponents <= 1 ? 130 + Math.random() * 40 : 30 + Math.random() * 20;
        let label = v.label || String(v.id);
        if (label.length > 500) {
          label = label.substring(0, 497) + "...";
        }
        const node = {
          id: v.id,
          isHub: false,
          label,
          targetX: target.targetX,
          targetY: target.targetY,
          componentId: target.componentId !== void 0 ? target.componentId : 0,
          x: v.x !== void 0 && typeof v.x === "number" && !isNaN(v.x) ? v.x : oldNode ? oldNode.x : target.spawnX + Math.cos(angle) * radius,
          y: v.y !== void 0 && typeof v.y === "number" && !isNaN(v.y) ? v.y : oldNode ? oldNode.y : target.spawnY + Math.sin(angle) * radius,
          vx: oldNode ? oldNode.vx : 0,
          vy: oldNode ? oldNode.vy : 0
        };
        this.nodes.push(node);
        this.nodeMap.set(v.id, node);
      });
      hyperedges.forEach((e, idx) => {
        if (e.vertices.length <= 1) return;
        const hubId = `_hub_${e.id}`;
        const oldNode = oldNodeMap.get(hubId);
        const target = nodeTargetCenters.get(hubId) || { x: centerX, y: centerY };
        let initX = 0;
        let initY = 0;
        let count = 0;
        e.vertices.forEach((vId) => {
          const vNode = this.nodeMap.get(vId);
          if (vNode) {
            initX += vNode.x;
            initY += vNode.y;
            count++;
          }
        });
        if (count > 0) {
          initX /= count;
          initY /= count;
        } else {
          initX = target.x;
          initY = target.y;
        }
        const node = {
          id: hubId,
          edgeId: e.id,
          isHub: true,
          label: e.label || `${idx + 1}`,
          targetX: target.targetX,
          targetY: target.targetY,
          componentId: target.componentId !== void 0 ? target.componentId : 0,
          x: oldNode ? oldNode.x : initX,
          y: oldNode ? oldNode.y : initY,
          vx: oldNode ? oldNode.vx : 0,
          vy: oldNode ? oldNode.vy : 0
        };
        this.nodes.push(node);
        this.nodeMap.set(hubId, node);
        e.vertices.forEach((vId) => {
          if (this.nodeMap.has(vId)) {
            this.links.push({
              vertexId: vId,
              hubId
            });
          }
        });
      });
      this.updateNodeDimensions(options);
    }
    /**
     * Runs a single step of the force-directed layout.
     */
    tick() {
      const n = this.nodes.length;
      if (n === 0) return;
      const vertexSize = this.options.vertexSize || 0.15;
      const vertexRadius = 12 * (vertexSize / 0.15);
      const blobMargin = vertexRadius * (this.options.boundaryScale || 2);
      const fx = new Array(n).fill(0);
      const fy = new Array(n).fill(0);
      const centerX = this.width / 2;
      const centerY = this.height / 2;
      const linkedPairs = /* @__PURE__ */ new Set();
      this.links.forEach((link) => {
        linkedPairs.add(`${link.vertexId}_${link.hubId}`);
      });
      const blobGap = 10;
      this.nodes.forEach((node) => {
        if (!node.isHub) return;
        let maxDist = 0;
        this.links.forEach((link) => {
          if (link.hubId !== node.id) return;
          const v = this.nodeMap.get(link.vertexId);
          if (!v) return;
          const dx = v.x - node.x;
          const dy = v.y - node.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          const vReach = d + (v.radius || v.halfWidth || vertexRadius);
          if (vReach > maxDist) maxDist = vReach;
        });
        const rawReach = maxDist + blobMargin;
        node.blobReach = node.blobReach != null ? 0.95 * node.blobReach + 0.05 * rawReach : rawReach;
      });
      for (let i = 0; i < n; i++) {
        const n1 = this.nodes[i];
        for (let j = i + 1; j < n; j++) {
          const n2 = this.nodes[j];
          let dx = n1.x - n2.x;
          let dy = n1.y - n2.y;
          let d = Math.sqrt(dx * dx + dy * dy);
          if (d < 0.1) {
            dx = (Math.random() - 0.5) * 2;
            dy = (Math.random() - 0.5) * 2;
            d = Math.sqrt(dx * dx + dy * dy);
          }
          const ux = dx / d;
          const uy = dy / d;
          const sameComp = n1.componentId === n2.componentId;
          const isLinked = n1.isHub && !n2.isHub && linkedPairs.has(`${n2.id}_${n1.id}`) || n2.isHub && !n1.isHub && linkedPairs.has(`${n1.id}_${n2.id}`);
          if (isLinked) {
            continue;
          }
          let r1 = 0;
          if (!sameComp && (n1.shape === "capsule" || n1.shape === "rect")) {
            r1 = Math.min(n1.halfWidth / Math.max(1e-4, Math.abs(ux)), n1.halfHeight / Math.max(1e-4, Math.abs(uy)));
          } else if (n1.isHub) {
            r1 = n1.radius || 4;
          } else {
            r1 = n1.radius || 12;
          }
          let r2 = 0;
          if (!sameComp && (n2.shape === "capsule" || n2.shape === "rect")) {
            r2 = Math.min(n2.halfWidth / Math.max(1e-4, Math.abs(ux)), n2.halfHeight / Math.max(1e-4, Math.abs(uy)));
          } else if (n2.isHub) {
            r2 = n2.radius || 4;
          } else {
            r2 = n2.radius || 12;
          }
          const R_repel = r1 + r2;
          let force = 0;
          let repelCoeff = this.kRepel;
          if (n1.isHub && n2.isHub) {
            repelCoeff = this.kHyperedgeRepel;
          } else if (n1.isHub || n2.isHub) {
            repelCoeff = (this.kRepel + this.kHyperedgeRepel) / 2;
          }
          if (sameComp) {
            if (d >= R_repel) {
              const dEff = d - R_repel + 24;
              force = repelCoeff / (dEff * dEff);
            } else {
              const overlap = R_repel - d;
              const kOverlap = repelCoeff / 500;
              force = repelCoeff / 576 + kOverlap * overlap;
            }
          } else {
            let goal;
            if (n1.isHub && n2.isHub) {
              const reach1 = n1.blobReach || blobMargin;
              const reach2 = n2.blobReach || blobMargin;
              goal = Math.max(this.componentSpacing, reach1 + reach2 + blobGap);
            } else {
              goal = Math.max(this.componentSpacing, R_repel + 2 * blobMargin + blobGap);
            }
            if (goal <= 0) {
              continue;
            }
            if (d < goal) {
              let factor = 1;
              if (this.kRepel > 0) {
                factor = repelCoeff / this.kRepel;
              }
              force = 0.2 * factor * (goal - d);
            }
          }
          if (force > 0) {
            const fX = dx / d * force;
            const fY = dy / d * force;
            fx[i] += fX;
            fy[i] += fY;
            fx[j] -= fX;
            fy[j] -= fY;
          }
        }
      }
      this.links.forEach((link) => {
        const vNode = this.nodeMap.get(link.vertexId);
        const hNode = this.nodeMap.get(link.hubId);
        if (!vNode || !hNode) return;
        const idxV = this.nodes.indexOf(vNode);
        const idxH = this.nodes.indexOf(hNode);
        const dx = vNode.x - hNode.x;
        const dy = vNode.y - hNode.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 0.1) return;
        let hOffset = 0;
        if (hNode.isHub && this.options.showHyperedgeLabels) {
          if (hNode.shape === "capsule" || hNode.shape === "rect") {
            const ux = dx / d;
            const uy = dy / d;
            hOffset = Math.min(hNode.halfWidth / Math.max(1e-4, Math.abs(ux)), hNode.halfHeight / Math.max(1e-4, Math.abs(uy)));
          } else {
            hOffset = hNode.radius || 4;
          }
        }
        const effRestLength = this.restLength + (vNode.radius || 12) + hOffset;
        const force = this.kAttract * (d - effRestLength);
        const fX = dx / d * force;
        const fY = dy / d * force;
        fx[idxV] -= fX;
        fy[idxV] -= fY;
        fx[idxH] += fX;
        fy[idxH] += fY;
      });
      for (let i = 0; i < n; i++) {
        const node = this.nodes[i];
        const targetX = node.targetX !== void 0 ? node.targetX : centerX;
        const targetY = node.targetY !== void 0 ? node.targetY : centerY;
        const dx = targetX - node.x;
        const dy = targetY - node.y;
        fx[i] += dx * this.kCenter;
        fy[i] += dy * this.kCenter;
      }
      for (let i = 0; i < n; i++) {
        const node = this.nodes[i];
        if (node.id === this.draggedNodeId || this.fixedNodeIds && this.fixedNodeIds.has(node.id)) {
          node.vx = 0;
          node.vy = 0;
          continue;
        }
        node.vx += fx[i];
        node.vy += fy[i];
        node.vx *= this.damping;
        node.vy *= this.damping;
        const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
        if (speed > this.maxSpeed) {
          node.vx = node.vx / speed * this.maxSpeed;
          node.vy = node.vy / speed * this.maxSpeed;
        }
        node.x += node.vx;
        node.y += node.vy;
      }
    }
    /**
     * Runs the layout simulation synchronously for a number of iterations.
     * Useful for a non-animated layout computation.
     */
    wrapText(text, maxCharsPerLine = 16) {
      if (!text) return [""];
      if (text.length <= maxCharsPerLine) return [text];
      const words = text.split(" ");
      const lines = [];
      let currentLine = "";
      words.forEach((word) => {
        if ((currentLine + " " + word).trim().length <= maxCharsPerLine) {
          currentLine = (currentLine + " " + word).trim();
        } else {
          if (currentLine) {
            lines.push(currentLine);
          }
          currentLine = word;
        }
      });
      if (currentLine) {
        lines.push(currentLine);
      }
      return lines;
    }
    updateNodeDimensions(options = {}) {
      this.options = { ...this.options, ...options };
      const theme = this.options.plotTheme || "name-labeled";
      const labelFontSize = this.options.labelFontSize || 12;
      const vertexSize = this.options.vertexSize || 0.15;
      const vertexRadius = 12 * (vertexSize / 0.15);
      this.nodes.forEach((node) => {
        if (node.isHub) {
          if (this.options.showHyperedgeLabels) {
            let label2 = node.label || "";
            if (label2.length > 500) {
              label2 = label2.substring(0, 497) + "...";
            }
            const L = label2.length;
            const fontSize = Math.max(10, labelFontSize - 1);
            const targetChars = Math.round(Math.sqrt(L * 4.5));
            const charsPerLine = Math.max(10, Math.min(45, targetChars));
            const lines = this.wrapText(label2, charsPerLine);
            node.lines = lines;
            const maxLineLength = Math.max(...lines.map((l) => l.length));
            const paddingX = 8;
            const paddingY = 5;
            const lineHeight = fontSize * 1.2;
            const rawLabelWidth = maxLineLength * (fontSize * 0.55);
            const estimatedTextWidth = Math.max(12, rawLabelWidth);
            if (lines.length === 1) {
              const w = estimatedTextWidth + 2 * paddingX;
              const h = fontSize + 2 * paddingY;
              node.shape = "capsule";
              node.width = w;
              node.height = h;
              node.halfWidth = w / 2;
              node.halfHeight = h / 2;
              node.radius = Math.max(w / 2, h / 2);
            } else {
              const w = estimatedTextWidth + 2 * paddingX;
              const h = (lines.length - 1) * lineHeight + fontSize + 2 * paddingY;
              node.shape = "rect";
              node.width = w;
              node.height = h;
              node.halfWidth = w / 2;
              node.halfHeight = h / 2;
              node.radius = Math.max(w / 2, h / 2);
            }
          } else {
            node.shape = "circle";
            node.radius = 4;
            node.halfWidth = 4;
            node.halfHeight = 4;
            node.width = 8;
            node.height = 8;
            node.lines = void 0;
          }
          return;
        }
        const label = node.label || "";
        if (theme === "clean") {
          node.shape = "circle";
          node.radius = vertexRadius;
          node.halfWidth = vertexRadius;
          node.halfHeight = vertexRadius;
        } else if (theme === "detailed") {
          const r = Math.max(4, vertexRadius * 0.4);
          node.shape = "circle";
          node.radius = r;
          node.halfWidth = r;
          node.halfHeight = r;
        } else {
          const L = label.length;
          const targetChars = Math.round(Math.sqrt(L * 3.5));
          const charsPerLine = Math.max(8, Math.min(30, targetChars));
          const lines = this.wrapText(label, charsPerLine);
          node.lines = lines;
          const maxLineLength = Math.max(...lines.map((l) => l.length));
          const paddingX = 10;
          const paddingY = 6;
          const lineHeight = labelFontSize * 1.2;
          const rawLabelWidth = maxLineLength * (labelFontSize * 0.55);
          const estimatedTextWidth = Math.max(16, rawLabelWidth);
          const circlePaddingX = 4;
          const fitsInCircle = lines.length === 1 && rawLabelWidth <= vertexRadius * 2 - circlePaddingX * 2;
          if (fitsInCircle) {
            const minRadius = Math.max(vertexRadius, rawLabelWidth / 2 + circlePaddingX);
            node.shape = "circle";
            node.radius = minRadius;
            node.halfWidth = minRadius;
            node.halfHeight = minRadius;
            node.width = minRadius * 2;
            node.height = minRadius * 2;
          } else if (lines.length === 1) {
            const w = estimatedTextWidth + 2 * paddingX;
            const h = labelFontSize + 2 * paddingY;
            node.shape = "capsule";
            node.width = w;
            node.height = h;
            node.halfWidth = w / 2;
            node.halfHeight = h / 2;
            node.radius = Math.max(w / 2, h / 2);
          } else {
            const w = estimatedTextWidth + 2 * paddingX;
            const h = (lines.length - 1) * lineHeight + labelFontSize + 2 * paddingY;
            node.shape = "rect";
            node.width = w;
            node.height = h;
            node.halfWidth = w / 2;
            node.halfHeight = h / 2;
            node.radius = Math.max(w / 2, h / 2);
          }
        }
      });
    }
    runStatic(iterations = 250) {
      for (let i = 0; i < iterations; i++) {
        this.tick();
      }
    }
  };
  function circularLayout(vertices, hyperedges, width, height, radius = null) {
    const n = vertices.length;
    if (n === 0) return /* @__PURE__ */ new Map();
    const centerX = width / 2;
    const centerY = height / 2;
    const r = radius || Math.min(width, height) * 0.35;
    const positions = /* @__PURE__ */ new Map();
    vertices.forEach((v, idx) => {
      const angle = idx / n * 2 * Math.PI;
      positions.set(v.id, {
        x: centerX + r * Math.cos(angle),
        y: centerY + r * Math.sin(angle)
      });
    });
    hyperedges.forEach((e) => {
      const hubId = `_hub_${e.id}`;
      let avgX = 0;
      let avgY = 0;
      let count = 0;
      e.vertices.forEach((vId) => {
        const pos = positions.get(vId);
        if (pos) {
          avgX += pos.x;
          avgY += pos.y;
          count++;
        }
      });
      if (count > 0) {
        positions.set(hubId, { x: avgX / count, y: avgY / count });
      } else {
        positions.set(hubId, { x: centerX, y: centerY });
      }
    });
    return positions;
  }
  function gridLayout(vertices, hyperedges, width, height) {
    const n = vertices.length;
    if (n === 0) return /* @__PURE__ */ new Map();
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    const paddingX = width / (cols + 1);
    const paddingY = height / (rows + 1);
    const positions = /* @__PURE__ */ new Map();
    vertices.forEach((v, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      positions.set(v.id, {
        x: paddingX * (col + 1),
        y: paddingY * (row + 1)
      });
    });
    hyperedges.forEach((e) => {
      const hubId = `_hub_${e.id}`;
      let avgX = 0;
      let avgY = 0;
      let count = 0;
      e.vertices.forEach((vId) => {
        const pos = positions.get(vId);
        if (pos) {
          avgX += pos.x;
          avgY += pos.y;
          count++;
        }
      });
      if (count > 0) {
        positions.set(hubId, { x: avgX / count, y: avgY / count });
      } else {
        positions.set(hubId, { x: width / 2, y: height / 2 });
      }
    });
    return positions;
  }

  // src/vendor/hypergraph-plotter/hypergraph-plotter.js
  function getNodeHullPoints(node) {
    if (node.shape === "rect") {
      const x = node.x;
      const y = node.y;
      const hw = node.halfWidth || 10;
      const hh = node.halfHeight || 10;
      return [
        { x: x - hw, y: y - hh },
        { x: x - hw, y: y + hh },
        { x: x + hw, y: y - hh },
        { x: x + hw, y: y + hh }
      ];
    }
    if (node.shape === "capsule") {
      const x = node.x;
      const y = node.y;
      const hw = node.halfWidth || 10;
      const hh = node.halfHeight || 10;
      if (hw > hh) {
        const offset = hw - hh;
        return [
          { x: x - offset, y },
          { x: x + offset, y }
        ];
      } else if (hh > hw) {
        const offset = hh - hw;
        return [
          { x, y: y - offset },
          { x, y: y + offset }
        ];
      }
    }
    return [{ x: node.x, y: node.y }];
  }
  var HypergraphPlotter = class {
    constructor(container, options = {}) {
      this.container = typeof container === "string" ? document.querySelector(container) : container;
      if (!this.container) {
        throw new Error("HypergraphPlotter: Container element not found.");
      }
      this.options = {
        width: 800,
        height: 600,
        canvasBg: "transparent",
        canvasBgCustom: "#ffffff",
        layoutType: "spring-embedding",
        vertexSize: 0.15,
        vertexOutlineWidth: 1.5,
        plotTheme: "name-labeled",
        nodeFillType: "automatic",
        nodeFillCustom: "#ffffff",
        labelFontFamily: "sans-serif",
        labelFontSize: 12,
        showSubsetBoundary: true,
        boundaryScale: 2,
        blobOpacity: 0.18,
        blobOutlineWidth: 1.5,
        showSubsetEdge: true,
        edgeWidth: 2,
        edgePalette: "rainbow",
        edgeColorCustom: "#3b82f6",
        showHubs: false,
        showGrid: false,
        gridColor: "#000000",
        gridOpacity: 0.04,
        physicsPlaying: true,
        pinOnDrag: false,
        allowPan: true,
        allowZoom: true,
        allowDrag: true,
        hidePinDashes: false,
        showHyperedgeLabels: false,
        initialZoom: null,
        // Force-directed layout physics parameters
        kAttract: 0.2,
        kRepel: 1e4,
        kHyperedgeRepel: 1e4,
        kCenter: 4e-3,
        restLength: 0,
        componentSpacing: 90,
        damping: 0.88,
        maxSpeed: 10,
        ...options
      };
      this.vertices = [];
      this.hyperedges = [];
      this.selectedVertexIds = /* @__PURE__ */ new Set();
      this.pinnedNodeIds = /* @__PURE__ */ new Set();
      this.pan = { x: 0, y: 0 };
      this.zoom = 1;
      this.isPanning = false;
      this.panStart = { x: 0, y: 0 };
      this.draggedNodeId = null;
      this.hasDragged = false;
      this.uuid = "hgp-" + Math.random().toString(36).substring(2, 9);
      this.onSelectionChanged = null;
      this.onNodeDragged = null;
      this.onDataChanged = null;
      this.animationFrameId = null;
      this._initDom();
      this._initPhysics();
      this._initEvents();
      this.startSimulation();
    }
    /**
     * Constructs the SVG canvas and component drawing layers dynamically.
     */
    _initDom() {
      let svg;
      if (this.container.tagName && this.container.tagName.toLowerCase() === "svg") {
        svg = this.container;
      } else {
        svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        this.container.appendChild(svg);
      }
      this.svg = svg;
      this.svg.style.userSelect = "none";
      this.svg.style.overflow = "hidden";
      this.svg.style.display = "block";
      let defs = this.svg.querySelector("defs");
      if (!defs) {
        defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        this.svg.appendChild(defs);
      }
      this.defs = defs;
      const pattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
      pattern.setAttribute("id", `${this.uuid}-grid-pattern`);
      pattern.setAttribute("width", "40");
      pattern.setAttribute("height", "40");
      pattern.setAttribute("patternUnits", "userSpaceOnUse");
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("id", `${this.uuid}-grid-pattern-path`);
      path.setAttribute("d", "M 40 0 L 0 0 0 40");
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", this.options.gridColor);
      path.setAttribute("stroke-width", "1");
      path.setAttribute("stroke-opacity", String(this.options.gridOpacity));
      pattern.appendChild(path);
      this.defs.appendChild(pattern);
      this.gridPatternPath = path;
      const gridRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      gridRect.setAttribute("id", `${this.uuid}-grid-rect`);
      gridRect.setAttribute("width", "100%");
      gridRect.setAttribute("height", "100%");
      gridRect.setAttribute("fill", `url(#${this.uuid}-grid-pattern)`);
      gridRect.style.display = this.options.showGrid ? "inline" : "none";
      this.svg.appendChild(gridRect);
      this.gridRect = gridRect;
      const zoomLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
      zoomLayer.setAttribute("id", `${this.uuid}-zoom-transform-layer`);
      this.svg.appendChild(zoomLayer);
      this.zoomLayer = zoomLayer;
      this.blobsLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
      this.blobsLayer.setAttribute("id", `${this.uuid}-blobs-layer`);
      this.zoomLayer.appendChild(this.blobsLayer);
      this.edgesLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
      this.edgesLayer.setAttribute("id", `${this.uuid}-edges-layer`);
      this.zoomLayer.appendChild(this.edgesLayer);
      this.hubsLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
      this.hubsLayer.setAttribute("id", `${this.uuid}-hubs-layer`);
      this.zoomLayer.appendChild(this.hubsLayer);
      this.verticesLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
      this.verticesLayer.setAttribute("id", `${this.uuid}-vertices-layer`);
      this.zoomLayer.appendChild(this.verticesLayer);
      this.labelsLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
      this.labelsLayer.setAttribute("id", `${this.uuid}-labels-layer`);
      this.zoomLayer.appendChild(this.labelsLayer);
      this.hyperedgeLabelsLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
      this.hyperedgeLabelsLayer.setAttribute("id", `${this.uuid}-hyperedge-labels-layer`);
      this.zoomLayer.appendChild(this.hyperedgeLabelsLayer);
      this._updateBackground();
    }
    /**
     * Initializes the force-directed physics engine.
     */
    _initPhysics() {
      this.physicsLayout = new BipartiteForceLayout({
        width: this.svg.clientWidth || this.options.width,
        height: this.svg.clientHeight || this.options.height,
        kAttract: this.options.kAttract,
        kRepel: this.options.kRepel,
        kHyperedgeRepel: this.options.kHyperedgeRepel,
        kCenter: this.options.kCenter,
        restLength: this.options.restLength,
        componentSpacing: this.options.componentSpacing,
        damping: this.options.damping,
        maxSpeed: this.options.maxSpeed
      });
      this.physicsLayout.fixedNodeIds = this.pinnedNodeIds;
    }
    /**
     * Binds layout-level SVG mouse and zoom event listeners.
     */
    _initEvents() {
      this._eventsAbort = new AbortController();
      this.svg.addEventListener("mousedown", (e) => {
        const target = e.target;
        const vertexGroup = target.closest(".vertex");
        if (vertexGroup) {
          const vId = vertexGroup.getAttribute("data-id");
          if (this.options.allowDrag !== false) {
            this.draggedNodeId = vId;
            this.physicsLayout.draggedNodeId = vId;
            if (this.onNodeDragged) {
              this.onNodeDragged(vId, "start");
            }
          }
          return;
        }
        const hubElement = target.closest(".hub");
        if (hubElement) {
          const hubId = hubElement.getAttribute("data-hub-id");
          if (this.options.allowDrag !== false) {
            this.draggedNodeId = hubId;
            this.physicsLayout.draggedNodeId = hubId;
            if (this.onNodeDragged) {
              this.onNodeDragged(hubId, "start");
            }
          }
          return;
        }
        if (this.options.allowPan) {
          this.isPanning = true;
          this.panStart = {
            x: e.clientX - this.pan.x,
            y: e.clientY - this.pan.y
          };
        }
      });
      window.addEventListener("mousemove", (e) => {
        if (this.draggedNodeId) {
          this.hasDragged = true;
          const coords = this.getCanvasCoords(e);
          const node = this.physicsLayout.nodeMap.get(this.draggedNodeId);
          if (node) {
            node.x = coords.x;
            node.y = coords.y;
            node.vx = 0;
            node.vy = 0;
            if (!this.options.physicsPlaying || this.options.layoutType !== "spring-embedding") {
              this.draw();
            }
            if (this.onNodeDragged) {
              this.onNodeDragged(this.draggedNodeId, "drag", coords);
            }
          }
        } else if (this.isPanning && this.options.allowPan) {
          this.pan.x = e.clientX - this.panStart.x;
          this.pan.y = e.clientY - this.panStart.y;
          this.applyTransform();
        }
      }, { signal: this._eventsAbort.signal });
      window.addEventListener("mouseup", () => {
        if (this.draggedNodeId) {
          if (this.hasDragged && this.options.pinOnDrag) {
            this.pinnedNodeIds.add(this.draggedNodeId);
            this.draw();
          } else if (!this.hasDragged) {
            if (this.pinnedNodeIds.has(this.draggedNodeId)) {
              this.pinnedNodeIds.delete(this.draggedNodeId);
              this.draw();
            }
          }
          if (this.onNodeDragged) {
            this.onNodeDragged(this.draggedNodeId, "end");
          }
        }
        this.isPanning = false;
        this.draggedNodeId = null;
        this.hasDragged = false;
        if (this.physicsLayout) {
          this.physicsLayout.draggedNodeId = null;
        }
      }, { signal: this._eventsAbort.signal });
      this.svg.addEventListener("wheel", (e) => {
        e.preventDefault();
        if (!this.options.allowZoom) return;
        const factor = e.deltaY < 0 ? 1.08 : 0.92;
        this.adjustZoom(factor, e.clientX, e.clientY);
      }, { passive: false });
      this.svg.addEventListener("dblclick", (e) => {
        e.preventDefault();
        const target = e.target;
        const vertexGroup = target.closest(".vertex");
        if (vertexGroup) {
          const vId = vertexGroup.getAttribute("data-id");
          if (this.pinnedNodeIds.has(vId)) {
            this.pinnedNodeIds.delete(vId);
          } else {
            this.pinnedNodeIds.add(vId);
          }
          this.draw();
          return;
        }
        const hubElement = target.closest(".hub");
        if (hubElement) {
          const hubId = hubElement.getAttribute("data-hub-id");
          if (this.pinnedNodeIds.has(hubId)) {
            this.pinnedNodeIds.delete(hubId);
          } else {
            this.pinnedNodeIds.add(hubId);
          }
          this.draw();
          return;
        }
      });
    }
    /**
     * Main render function representing the state on the SVG canvas layers.
     */
    draw() {
      this.blobsLayer.innerHTML = "";
      this.edgesLayer.innerHTML = "";
      this.hubsLayer.innerHTML = "";
      this.verticesLayer.innerHTML = "";
      this.labelsLayer.innerHTML = "";
      const vertexRadius = this.getVertexRadius();
      const palette = this.options.edgePalette;
      const theme = this.options.plotTheme;
      const isDarkCanvas = this.options.canvasBg === "dark-slate" || this.options.canvasBg === "custom" && this.isDarkColor(this.options.canvasBgCustom);
      const labelColor = isDarkCanvas ? "#f8f9fa" : "#212529";
      const nodeStrokeColor = isDarkCanvas ? "#e9ecef" : "#212529";
      const nodeFillColor = this.options.nodeFillType === "custom" ? this.options.nodeFillCustom : isDarkCanvas ? "#2c3036" : "#ffffff";
      let fontFamilyStr = '"Outfit", sans-serif';
      if (this.options.labelFontFamily === "serif") {
        fontFamilyStr = '"Times New Roman", Times, "Century Schoolbook", serif';
      } else if (this.options.labelFontFamily === "monospace") {
        fontFamilyStr = '"JetBrains Mono", Consolas, Monaco, monospace';
      }
      if (this.options.showSubsetBoundary) {
        this.hyperedges.forEach((edge, idx) => {
          const coords = [];
          edge.vertices.forEach((vId) => {
            const simNode = this.physicsLayout.nodeMap.get(vId);
            if (simNode) {
              coords.push(...getNodeHullPoints(simNode));
            }
          });
          if (coords.length === 0) return;
          const hubNode = this.physicsLayout.nodeMap.get(`_hub_${edge.id}`);
          if (hubNode) {
            coords.push(...getNodeHullPoints(hubNode));
          }
          const blobRadius = vertexRadius * this.options.boundaryScale;
          const pathData = getBlobPath(coords, blobRadius);
          if (!pathData) return;
          const blobColor = edge.color || this.getPaletteColor(idx, this.hyperedges.length, palette);
          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          path.setAttribute("d", pathData);
          path.setAttribute("fill", blobColor);
          path.setAttribute("stroke", blobColor);
          path.setAttribute("fill-opacity", String(this.options.blobOpacity));
          path.setAttribute("stroke-opacity", this.options.blobOutlineWidth > 0 ? "0.7" : "0");
          path.setAttribute("stroke-width", `${this.options.blobOutlineWidth}px`);
          path.setAttribute("stroke-linejoin", "round");
          path.setAttribute("stroke-linecap", "round");
          path.setAttribute("data-id", edge.id);
          this.blobsLayer.appendChild(path);
        });
      }
      if (this.options.showSubsetEdge) {
        this.hyperedges.forEach((edge, idx) => {
          if (edge.vertices.length < 1) return;
          const edgeColor = edge.color || this.getPaletteColor(idx, this.hyperedges.length, palette);
          if (edge.vertices.length === 1) {
            if (!this.options.showSubsetBoundary) {
              const vNode = this.physicsLayout.nodeMap.get(edge.vertices[0]);
              if (!vNode) return;
              const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
              circle.setAttribute("cx", String(vNode.x));
              circle.setAttribute("cy", String(vNode.y));
              circle.setAttribute("r", String(vertexRadius * 1.5));
              circle.setAttribute("fill", "none");
              circle.setAttribute("stroke", edgeColor);
              circle.setAttribute("stroke-width", `${this.options.edgeWidth}px`);
              circle.setAttribute("opacity", "0.85");
              this.edgesLayer.appendChild(circle);
            }
          } else {
            const hubNode = this.physicsLayout.nodeMap.get(`_hub_${edge.id}`);
            if (!hubNode) return;
            const v0 = this.physicsLayout.nodeMap.get(edge.vertices[0]);
            if (!v0) return;
            for (let i = 1; i < edge.vertices.length; i++) {
              const vi = this.physicsLayout.nodeMap.get(edge.vertices[i]);
              if (!vi) continue;
              const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
              const pathData = `M ${v0.x} ${v0.y} Q ${hubNode.x} ${hubNode.y} ${vi.x} ${vi.y}`;
              path.setAttribute("d", pathData);
              path.setAttribute("fill", "none");
              path.setAttribute("stroke", edgeColor);
              path.setAttribute("stroke-width", `${this.options.edgeWidth}px`);
              path.setAttribute("opacity", "0.85");
              this.edgesLayer.appendChild(path);
            }
          }
        });
      }
      if (this.options.showHubs) {
        this.hyperedges.forEach((edge, idx) => {
          const hubNode = this.physicsLayout.nodeMap.get(`_hub_${edge.id}`);
          if (!hubNode) return;
          const edgeColor = edge.color || this.getPaletteColor(idx, this.hyperedges.length, palette);
          const isHubPinned = this.pinnedNodeIds.has(hubNode.id);
          const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          circle.setAttribute("class", "hub");
          circle.setAttribute("cx", String(hubNode.x));
          circle.setAttribute("cy", String(hubNode.y));
          circle.setAttribute("r", "4");
          circle.setAttribute("fill", edgeColor);
          const showHubPinnedStyle = isHubPinned && !this.options.hidePinDashes;
          circle.setAttribute("stroke", showHubPinnedStyle ? "var(--primary, #3b82f6)" : "#ffffff");
          circle.setAttribute("stroke-width", showHubPinnedStyle ? "1.5px" : "1px");
          if (showHubPinnedStyle) {
            circle.setAttribute("stroke-dasharray", "2,1");
          }
          circle.setAttribute("fill-opacity", "0.5");
          circle.setAttribute("data-hub-id", hubNode.id);
          circle.style.cursor = "pointer";
          this.hubsLayer.appendChild(circle);
        });
      }
      this.vertices.forEach((v) => {
        const simNode = this.physicsLayout.nodeMap.get(v.id);
        if (!simNode) return;
        const isSelected = this.selectedVertexIds.has(v.id);
        const isPinned = this.pinnedNodeIds.has(v.id);
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("class", "vertex");
        g.setAttribute("data-id", v.id);
        const titleEl = document.createElementNS("http://www.w3.org/2000/svg", "title");
        titleEl.textContent = v.label || String(v.id);
        g.appendChild(titleEl);
        let shapeEl;
        if (theme === "name-labeled" && simNode.shape === "rect") {
          shapeEl = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          const w = simNode.width;
          const h = simNode.height;
          shapeEl.setAttribute("x", String(simNode.x - w / 2));
          shapeEl.setAttribute("y", String(simNode.y - h / 2));
          shapeEl.setAttribute("width", String(w));
          shapeEl.setAttribute("height", String(h));
          shapeEl.setAttribute("rx", "8");
          shapeEl.setAttribute("ry", "8");
          shapeEl.setAttribute("fill", isSelected ? "#e9ecef" : nodeFillColor);
          shapeEl.setAttribute("stroke", isSelected ? "var(--primary, #3b82f6)" : nodeStrokeColor);
          shapeEl.setAttribute("stroke-width", `${isSelected ? this.options.vertexOutlineWidth + 1.5 : this.options.vertexOutlineWidth}px`);
        } else if (theme === "name-labeled" && simNode.shape === "capsule") {
          shapeEl = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          const w = simNode.width;
          const h = simNode.height;
          shapeEl.setAttribute("x", String(simNode.x - w / 2));
          shapeEl.setAttribute("y", String(simNode.y - h / 2));
          shapeEl.setAttribute("width", String(w));
          shapeEl.setAttribute("height", String(h));
          shapeEl.setAttribute("rx", String(h / 2));
          shapeEl.setAttribute("ry", String(h / 2));
          shapeEl.setAttribute("fill", isSelected ? "#e9ecef" : nodeFillColor);
          shapeEl.setAttribute("stroke", isSelected ? "var(--primary, #3b82f6)" : nodeStrokeColor);
          shapeEl.setAttribute("stroke-width", `${isSelected ? this.options.vertexOutlineWidth + 1.5 : this.options.vertexOutlineWidth}px`);
        } else {
          shapeEl = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          shapeEl.setAttribute("cx", String(simNode.x));
          shapeEl.setAttribute("cy", String(simNode.y));
          shapeEl.setAttribute("stroke", isSelected ? "var(--primary, #3b82f6)" : nodeStrokeColor);
          shapeEl.setAttribute("stroke-width", `${isSelected ? this.options.vertexOutlineWidth + 1.5 : this.options.vertexOutlineWidth}px`);
          let currentRadius = vertexRadius;
          if (theme === "clean") {
            currentRadius = vertexRadius;
            shapeEl.setAttribute("r", String(currentRadius));
            const cleanFill = this.options.nodeFillType === "custom" ? nodeFillColor : isDarkCanvas ? "#adb5bd" : "#495057";
            shapeEl.setAttribute("fill", isSelected ? "var(--primary, #3b82f6)" : cleanFill);
          } else if (theme === "detailed") {
            currentRadius = Math.max(4, vertexRadius * 0.4);
            shapeEl.setAttribute("r", String(currentRadius));
            const detailedFill = this.options.nodeFillType === "custom" ? nodeFillColor : isDarkCanvas ? "#e9ecef" : "#000000";
            shapeEl.setAttribute("fill", isSelected ? "var(--primary, #3b82f6)" : detailedFill);
          } else {
            currentRadius = vertexRadius;
            shapeEl.setAttribute("r", String(simNode.radius || currentRadius));
            shapeEl.setAttribute("fill", isSelected ? "#e9ecef" : nodeFillColor);
          }
        }
        if (isPinned && !this.options.hidePinDashes) {
          shapeEl.setAttribute("stroke-dasharray", "3,2");
        }
        g.appendChild(shapeEl);
        this.verticesLayer.appendChild(g);
        if (theme !== "clean") {
          const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
          text.setAttribute("font-family", fontFamilyStr);
          text.setAttribute("font-size", `${this.options.labelFontSize}px`);
          text.setAttribute("fill", labelColor);
          text.setAttribute("font-weight", "500");
          text.setAttribute("pointer-events", "none");
          if (theme === "detailed") {
            text.textContent = simNode.label || v.label;
            text.setAttribute("x", String(simNode.x + Math.max(8, vertexRadius * 0.5)));
            text.setAttribute("y", String(simNode.y - Math.max(8, vertexRadius * 0.5)));
            text.setAttribute("text-anchor", "start");
            this.labelsLayer.appendChild(text);
          } else {
            const lines = simNode.lines || this.physicsLayout.wrapText(simNode.label || v.label, 16);
            const lineHeight = this.options.labelFontSize * 1.2;
            const startY = simNode.y - (lines.length - 1) * lineHeight / 2 + this.options.labelFontSize * 0.35;
            lines.forEach((lineText, idx) => {
              const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
              tspan.textContent = lineText;
              tspan.setAttribute("x", String(simNode.x));
              tspan.setAttribute("y", String(startY + idx * lineHeight));
              tspan.setAttribute("text-anchor", "middle");
              text.appendChild(tspan);
            });
            this.labelsLayer.appendChild(text);
          }
        }
      });
      this.hyperedgeLabelsLayer.innerHTML = "";
      if (this.options.showHyperedgeLabels) {
        const fontFamilyStr2 = this.options.labelFontFamily === "monospace" ? "JetBrains Mono, monospace" : this.options.labelFontFamily === "serif" ? "Times New Roman, serif" : "Outfit, sans-serif";
        const isDarkCanvas2 = this.options.canvasBg === "dark-slate" || this.options.canvasBg === "custom" && this.isDarkColor(this.options.canvasBgCustom);
        const labelColor2 = isDarkCanvas2 ? "#e9ecef" : "#374151";
        let canvasBgColor = "#ffffff";
        if (this.options.canvasBg === "light-grey") canvasBgColor = "#f8f9fa";
        else if (this.options.canvasBg === "dark-slate") canvasBgColor = "#1a1e24";
        else if (this.options.canvasBg === "custom") canvasBgColor = this.options.canvasBgCustom || "#ffffff";
        else if (this.options.canvasBg === "transparent") {
          canvasBgColor = isDarkCanvas2 ? "#1a1e24" : "#ffffff";
        }
        this.hyperedges.forEach((edge, idx) => {
          const hubNode = this.physicsLayout.nodeMap.get(`_hub_${edge.id}`);
          if (!hubNode) return;
          const originalLabel = edge.label || `${idx + 1}`;
          let labelText = originalLabel;
          if (labelText.length > 500) {
            labelText = labelText.substring(0, 497) + "...";
          }
          if (hubNode.shape === "capsule" || hubNode.shape === "rect") {
            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            const w = hubNode.width || 20;
            const h = hubNode.height || 20;
            rect.setAttribute("x", String(hubNode.x - w / 2));
            rect.setAttribute("y", String(hubNode.y - h / 2));
            rect.setAttribute("width", String(w));
            rect.setAttribute("height", String(h));
            if (hubNode.shape === "capsule") {
              rect.setAttribute("rx", String(h / 2));
              rect.setAttribute("ry", String(h / 2));
            } else {
              rect.setAttribute("rx", "6");
              rect.setAttribute("ry", "6");
            }
            rect.setAttribute("fill", isDarkCanvas2 ? "rgba(30, 41, 59, 0.85)" : "rgba(255, 255, 255, 0.85)");
            rect.setAttribute("stroke", isDarkCanvas2 ? "#475569" : "#cbd5e1");
            rect.setAttribute("stroke-width", "1px");
            rect.setAttribute("pointer-events", "none");
            this.hyperedgeLabelsLayer.appendChild(rect);
          }
          const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
          text.setAttribute("font-family", fontFamilyStr2);
          text.setAttribute("font-size", `${Math.max(10, this.options.labelFontSize - 1)}px`);
          text.setAttribute("fill", labelColor2);
          text.setAttribute("font-weight", "600");
          text.setAttribute("pointer-events", "none");
          const titleEl = document.createElementNS("http://www.w3.org/2000/svg", "title");
          titleEl.textContent = originalLabel;
          text.appendChild(titleEl);
          const lines = hubNode.lines || [labelText];
          const fontSize = Math.max(10, this.options.labelFontSize - 1);
          const lineHeight = fontSize * 1.2;
          const startY = hubNode.y - (lines.length - 1) * lineHeight / 2 + fontSize * 0.35;
          lines.forEach((lineText, lIdx) => {
            const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
            tspan.textContent = lineText;
            tspan.setAttribute("x", String(hubNode.x));
            tspan.setAttribute("y", String(startY + lIdx * lineHeight));
            tspan.setAttribute("text-anchor", "middle");
            text.appendChild(tspan);
          });
          this.hyperedgeLabelsLayer.appendChild(text);
        });
      }
    }
    /**
     * Sets the dataset (vertices & hyperedges) of the visualizer.
     * Runs layout warmup ticks to settle nodes and centers the view by default.
     */
    setData(data) {
      const isFirstLoad = this.vertices.length === 0;
      this.vertices = data.vertices || [];
      this.hyperedges = data.hyperedges || [];
      this.physicsLayout.setGraph(this.vertices, this.hyperedges, this.options);
      if (this.options.layoutType === "spring-embedding") {
        const ticks = isFirstLoad ? 250 : 100;
        for (let i = 0; i < ticks; i++) {
          this.physicsLayout.tick();
        }
      } else {
        this._applyStaticLayout();
      }
      if (isFirstLoad && this.options.initialZoom != null) {
        const svgRect = this.svg.getBoundingClientRect();
        const screenW = svgRect.width || this.options.width;
        const screenH = svgRect.height || this.options.height;
        this.zoom = this.options.initialZoom;
        this.pan.x = screenW / 2 - this.physicsLayout.width / 2 * this.zoom;
        this.pan.y = screenH / 2 - this.physicsLayout.height / 2 * this.zoom;
        this.applyTransform();
      } else {
        const svgRect = this.svg.getBoundingClientRect();
        const width = svgRect.width || this.options.width;
        const height = svgRect.height || this.options.height;
        const isEmbedNoUI = document.body.classList.contains("embed-mode") && (!document.getElementById("control-sidebar") || document.getElementById("control-sidebar").style.display === "none");
        const padding = isFirstLoad ? isEmbedNoUI ? Math.max(20, Math.min(width * 0.05, height * 0.05)) : Math.max(60, Math.min(width * 0.18, height * 0.18)) : isEmbedNoUI ? Math.max(16, Math.min(width * 0.04, height * 0.04)) : null;
        this.zoomToFit(padding);
      }
      if (this.onDataChanged) {
        this.onDataChanged();
      }
      this.draw();
    }
    /**
     * Adjusts the configurations and styling of the visualizer.
     */
    setOptions(options = {}) {
      this.options = { ...this.options, ...options };
      if (this.gridRect) {
        this.gridRect.style.display = this.options.showGrid ? "inline" : "none";
      }
      if (this.gridPatternPath) {
        this.gridPatternPath.setAttribute("stroke", this.options.gridColor);
        this.gridPatternPath.setAttribute("stroke-opacity", String(this.options.gridOpacity));
      }
      this._updateBackground();
      if (this.physicsLayout) {
        this.physicsLayout.kAttract = this.options.kAttract;
        this.physicsLayout.kRepel = this.options.kRepel;
        this.physicsLayout.kHyperedgeRepel = this.options.kHyperedgeRepel;
        this.physicsLayout.kCenter = this.options.kCenter;
        this.physicsLayout.restLength = this.options.restLength;
        this.physicsLayout.componentSpacing = this.options.componentSpacing;
        this.physicsLayout.damping = this.options.damping;
        this.physicsLayout.maxSpeed = this.options.maxSpeed;
        this.physicsLayout.updateNodeDimensions(this.options);
        if (options.componentSpacing !== void 0 && this.vertices.length > 0) {
          this.physicsLayout.setGraph(this.vertices, this.hyperedges, this.options);
        }
      }
      if (this.options.layoutType !== "spring-embedding") {
        this._applyStaticLayout();
      }
      this.draw();
    }
    /**
     * Computes static coordinates when force simulation is turned off.
     */
    _applyStaticLayout() {
      const w = this.svg.clientWidth || this.options.width;
      const h = this.svg.clientHeight || this.options.height;
      let posMap = null;
      if (this.options.layoutType === "radial-embedding") {
        posMap = circularLayout(this.vertices, this.hyperedges, w, h);
      } else if (this.options.layoutType === "grid-layout") {
        posMap = gridLayout(this.vertices, this.hyperedges, w, h);
      }
      if (posMap) {
        this.physicsLayout.nodes.forEach((node) => {
          const pos = posMap.get(node.id);
          if (pos) {
            node.x = pos.x;
            node.y = pos.y;
            node.vx = 0;
            node.vy = 0;
          }
        });
      }
    }
    /**
     * Triggers background updates on the canvas container style.
     */
    _updateBackground() {
      if (this.options.canvasBg === "white") {
        this.svg.style.backgroundColor = "#ffffff";
      } else if (this.options.canvasBg === "light-grey") {
        this.svg.style.backgroundColor = "#f8f9fa";
      } else if (this.options.canvasBg === "dark-slate") {
        this.svg.style.backgroundColor = "#1a1e24";
      } else if (this.options.canvasBg === "custom") {
        this.svg.style.backgroundColor = this.options.canvasBgCustom || "#ffffff";
      } else {
        this.svg.style.backgroundColor = "transparent";
      }
    }
    /**
     * Starts the animation frame loop for the physics simulation.
     */
    startSimulation() {
      if (this.animationFrameId) return;
      const tickLoop = () => {
        if (this.options.physicsPlaying && this.options.layoutType === "spring-embedding") {
          this.physicsLayout.tick();
          this.draw();
        }
        this.animationFrameId = requestAnimationFrame(tickLoop);
      };
      this.animationFrameId = requestAnimationFrame(tickLoop);
    }
    /**
     * Cancels the animation frame loop.
     */
    stopSimulation() {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    }
    /**
     * Translates screen offset coordinates into the SVG scale space.
     */
    getCanvasCoords(event) {
      const rect = this.svg.getBoundingClientRect();
      const x = (event.clientX - rect.left - this.pan.x) / this.zoom;
      const y = (event.clientY - rect.top - this.pan.y) / this.zoom;
      return { x, y };
    }
    /**
     * Scales the view frame based on a zoom multiplier.
     */
    adjustZoom(factor, clientX = null, clientY = null) {
      const oldZoom = this.zoom;
      this.zoom = Math.max(0.1, Math.min(10, this.zoom * factor));
      if (clientX !== null && clientY !== null) {
        const rect = this.svg.getBoundingClientRect();
        const mx = clientX - rect.left;
        const my = clientY - rect.top;
        const localX = (mx - this.pan.x) / oldZoom;
        const localY = (my - this.pan.y) / oldZoom;
        this.pan.x = mx - localX * this.zoom;
        this.pan.y = my - localY * this.zoom;
      }
      this.applyTransform();
      this.draw();
    }
    /**
     * Applies current zoom/pan values onto the DOM layers.
     */
    applyTransform() {
      this.zoomLayer.setAttribute("transform", `translate(${this.pan.x}, ${this.pan.y}) scale(${this.zoom})`);
    }
    /**
     * Recompute vertex sizing based on properties.
     */
    getVertexRadius() {
      return 12 * (this.options.vertexSize / 0.15);
    }
    /**
     * Centers the centroid of layout nodes in the middle of the container.
     */
    recenter() {
      if (this.vertices.length === 0) return;
      const svgRect = this.svg.getBoundingClientRect();
      const width = svgRect.width || this.options.width;
      const height = svgRect.height || this.options.height;
      const layoutNodes = this.physicsLayout.nodes;
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      layoutNodes.forEach((node) => {
        if (node.isHub && !this.options.showSubsetEdge && !this.options.showSubsetBoundary) return;
        minX = Math.min(minX, node.x);
        maxX = Math.max(maxX, node.x);
        minY = Math.min(minY, node.y);
        maxY = Math.max(maxY, node.y);
      });
      const graphW = maxX - minX;
      const graphH = maxY - minY;
      if (graphW <= 0 || graphH <= 0) return;
      const graphCenterX = minX + graphW / 2;
      const graphCenterY = minY + graphH / 2;
      this.pan.x = width / 2 - graphCenterX * this.zoom;
      this.pan.y = height / 2 - graphCenterY * this.zoom;
      this.applyTransform();
      this.draw();
    }
    /**
     * Scales the view scale and centers the viewport to frame all layout nodes.
     */
    zoomToFit(padding = null) {
      if (this.vertices.length === 0) return;
      const svgRect = this.svg.getBoundingClientRect();
      const width = svgRect.width || this.options.width;
      const height = svgRect.height || this.options.height;
      const layoutNodes = this.physicsLayout.nodes;
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      layoutNodes.forEach((node) => {
        if (node.isHub && !this.options.showSubsetEdge && !this.options.showSubsetBoundary) return;
        const r = node.radius || 15;
        minX = Math.min(minX, node.x - r);
        maxX = Math.max(maxX, node.x + r);
        minY = Math.min(minY, node.y - r);
        maxY = Math.max(maxY, node.y + r);
      });
      const graphW = maxX - minX;
      const graphH = maxY - minY;
      if (graphW <= 0 || graphH <= 0) return;
      const isEmbedNoUI = document.body.classList.contains("embed-mode") && (!document.getElementById("control-sidebar") || document.getElementById("control-sidebar").style.display === "none");
      const defaultPadding = isEmbedNoUI ? Math.max(24, Math.min(width * 0.05, height * 0.05)) : Math.max(40, Math.min(width * 0.12, height * 0.12));
      const finalPadding = padding !== null ? padding : defaultPadding;
      const scaleX = (width - finalPadding * 2) / graphW;
      const scaleY = (height - finalPadding * 2) / graphH;
      const targetZoom = Math.max(0.1, Math.min(2.5, Math.min(scaleX, scaleY)));
      const graphCenterX = minX + graphW / 2;
      const graphCenterY = minY + graphH / 2;
      this.zoom = targetZoom;
      this.pan.x = width / 2 - graphCenterX * targetZoom;
      this.pan.y = height / 2 - graphCenterY * targetZoom;
      this.applyTransform();
      this.draw();
    }
    /**
     * Generates a self-contained, standalone presentation SVG vector string.
     */
    getSVGString() {
      const clonedSvg = this.svg.cloneNode(true);
      const grid = clonedSvg.querySelector(`#${this.uuid}-grid-rect`);
      if (grid) grid.remove();
      const hubs = clonedSvg.querySelector(`#${this.uuid}-hubs-layer`);
      if (hubs) hubs.remove();
      clonedSvg.querySelectorAll(".vertex circle, .vertex rect").forEach((el) => {
        el.removeAttribute("stroke-dasharray");
      });
      const rect = this.svg.getBoundingClientRect();
      clonedSvg.setAttribute("width", rect.width || "800");
      clonedSvg.setAttribute("height", rect.height || "600");
      clonedSvg.setAttribute("viewBox", `0 0 ${rect.width || 800} ${rect.height || 600}`);
      clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      let bgFill = "none";
      if (this.options.canvasBg === "white") bgFill = "#ffffff";
      else if (this.options.canvasBg === "light-grey") bgFill = "#f8f9fa";
      else if (this.options.canvasBg === "dark-slate") bgFill = "#1a1e24";
      else if (this.options.canvasBg === "custom") bgFill = this.options.canvasBgCustom || "#ffffff";
      if (bgFill !== "none") {
        const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        bgRect.setAttribute("width", "100%");
        bgRect.setAttribute("height", "100%");
        bgRect.setAttribute("fill", bgFill);
        clonedSvg.insertBefore(bgRect, clonedSvg.firstChild);
      }
      const serializer = new XMLSerializer();
      return serializer.serializeToString(clonedSvg);
    }
    /**
     * Helper to determine luminance of hex strings.
     */
    isDarkColor(hex) {
      if (!hex || hex === "transparent") return false;
      let color = hex.replace("#", "");
      if (color.length === 3) {
        color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
      }
      const r = parseInt(color.substr(0, 2), 16);
      const g = parseInt(color.substr(2, 2), 16);
      const b = parseInt(color.substr(4, 2), 16);
      const yiq = (r * 299 + g * 587 + b * 114) / 1e3;
      return yiq < 128;
    }
    /**
     * Color generation logic mapped to preset keys.
     */
    getPaletteColor(index, total, palette) {
      if (total <= 0) return "hsl(0, 0%, 20%)";
      const ratio = index / Math.max(1, total);
      switch (palette) {
        case "grayscale": {
          const grayVal = Math.round(ratio * 55);
          return `hsl(0, 0%, ${grayVal}%)`;
        }
        case "pastel": {
          const hue = index * 137.5 % 360;
          return `hsl(${hue}, 80%, 55%)`;
        }
        case "cool-ice": {
          const hue = 180 + ratio * 90;
          return `hsl(${hue}, 85%, 50%)`;
        }
        case "warm-sunset": {
          const hue = (330 + ratio * 90) % 360;
          return `hsl(${Math.round(hue)}, 90%, 50%)`;
        }
        case "ocean-breeze": {
          const hue = 160 + ratio * 100;
          return `hsl(${hue}, 85%, 45%)`;
        }
        case "forest-earth": {
          const hue = 80 + ratio * 60;
          return `hsl(${hue}, 55%, 40%)`;
        }
        case "neon-glow": {
          const hue = index * 137.5 % 360;
          return `hsl(${hue}, 100%, 50%)`;
        }
        case "viridis": {
          const hue = 280 - ratio * 220;
          const lightness = 35 + ratio * 15;
          return `hsl(${hue}, 85%, ${lightness}%)`;
        }
        case "plasma": {
          const hue = (240 + ratio * 170) % 360;
          const lightness = 40 + ratio * 15;
          return `hsl(${hue}, 85%, ${lightness}%)`;
        }
        case "cividis": {
          const hue = 225 - ratio * 165;
          const saturation = 60 - Math.sin(ratio * Math.PI) * 45;
          const lightness = 30 + ratio * 35;
          return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        }
        case "magma": {
          let h, s, l;
          if (ratio < 0.3) {
            const t = ratio / 0.3;
            h = 260 + t * 40;
            s = 60 + t * 10;
            l = 15 + t * 20;
          } else if (ratio < 0.6) {
            const t = (ratio - 0.3) / 0.3;
            h = 300 + t * 40;
            s = 70 + t * 15;
            l = 35 + t * 15;
          } else if (ratio < 0.9) {
            const t = (ratio - 0.6) / 0.3;
            h = 340 + t * 40;
            s = 85 + t * 10;
            l = 50 + t * 10;
          } else {
            const t = (ratio - 0.9) / 0.1;
            h = 20 + t * 30;
            s = 95 + t * 5;
            l = 60 + t * 15;
          }
          return `hsl(${Math.round(h) % 360}, ${Math.round(s)}%, ${Math.round(l)}%)`;
        }
        case "inferno": {
          let h, s, l;
          if (ratio < 0.3) {
            const t = ratio / 0.3;
            h = 260 + t * 80;
            s = 70 + t * 15;
            l = 12 + t * 18;
          } else if (ratio < 0.6) {
            const t = (ratio - 0.3) / 0.3;
            h = 340 + t * 35;
            s = 85 + t * 10;
            l = 30 + t * 20;
          } else if (ratio < 0.9) {
            const t = (ratio - 0.6) / 0.3;
            h = 15 + t * 30;
            s = 95 + t * 5;
            l = 50 + t * 15;
          } else {
            const t = (ratio - 0.9) / 0.1;
            h = 45 + t * 15;
            s = 100;
            l = 65 + t * 15;
          }
          return `hsl(${Math.round(h) % 360}, ${Math.round(s)}%, ${Math.round(l)}%)`;
        }
        case "cyberpunk": {
          const colors = [
            "hsl(320, 100%, 50%)",
            "hsl(180, 100%, 45%)",
            "hsl(280, 100%, 50%)",
            "hsl(45, 100%, 50%)",
            "hsl(210, 100%, 50%)"
          ];
          return colors[index % colors.length];
        }
        case "aurora": {
          const colors = [
            "hsl(150, 80%, 40%)",
            "hsl(175, 75%, 45%)",
            "hsl(195, 85%, 40%)",
            "hsl(230, 80%, 50%)",
            "hsl(275, 75%, 45%)",
            "hsl(295, 80%, 50%)"
          ];
          return colors[index % colors.length];
        }
        case "desert-sand": {
          const colors = [
            "hsl(20, 55%, 45%)",
            "hsl(35, 60%, 40%)",
            "hsl(12, 50%, 35%)",
            "hsl(140, 20%, 40%)",
            "hsl(45, 40%, 55%)",
            "hsl(330, 30%, 45%)"
          ];
          return colors[index % colors.length];
        }
        case "botanical": {
          const colors = [
            "hsl(130, 30%, 35%)",
            "hsl(85, 35%, 40%)",
            "hsl(160, 25%, 42%)",
            "hsl(110, 20%, 45%)",
            "hsl(40, 30%, 50%)",
            "hsl(200, 20%, 45%)"
          ];
          return colors[index % colors.length];
        }
        case "berry-wine": {
          const colors = [
            "hsl(340, 65%, 35%)",
            "hsl(310, 50%, 30%)",
            "hsl(355, 60%, 45%)",
            "hsl(280, 45%, 40%)",
            "hsl(325, 55%, 45%)",
            "hsl(250, 40%, 40%)"
          ];
          return colors[index % colors.length];
        }
        case "academic-bold": {
          const colors = [
            "hsl(350, 75%, 45%)",
            "hsl(217, 85%, 45%)",
            "hsl(152, 70%, 35%)",
            "hsl(35, 85%, 40%)",
            "hsl(270, 70%, 45%)",
            "hsl(190, 85%, 35%)"
          ];
          return colors[index % colors.length];
        }
        case "academic-set1": {
          const colors = [
            "hsl(359, 79%, 50%)",
            "hsl(207, 54%, 47%)",
            "hsl(118, 41%, 49%)",
            "hsl(292, 35%, 47%)",
            "hsl(30, 100%, 50%)",
            "hsl(60, 100%, 40%)",
            "hsl(22, 61%, 40%)",
            "hsl(329, 87%, 74%)",
            "hsl(0, 0%, 60%)"
          ];
          return colors[index % colors.length];
        }
        case "academic-set2": {
          const colors = [
            "hsl(161, 44%, 58%)",
            "hsl(17, 97%, 69%)",
            "hsl(222, 38%, 67%)",
            "hsl(323, 62%, 72%)",
            "hsl(83, 62%, 59%)",
            "hsl(49, 100%, 59%)",
            "hsl(35, 62%, 74%)",
            "hsl(0, 0%, 70%)"
          ];
          return colors[index % colors.length];
        }
        case "academic-dark": {
          const colors = [
            "hsl(162, 71%, 36%)",
            "hsl(26, 98%, 43%)",
            "hsl(245, 31%, 57%)",
            "hsl(329, 80%, 53%)",
            "hsl(88, 69%, 38%)",
            "hsl(44, 98%, 45%)",
            "hsl(39, 70%, 38%)",
            "hsl(0, 0%, 40%)"
          ];
          return colors[index % colors.length];
        }
        case "academic-paired": {
          const colors = [
            "hsl(201, 53%, 77%)",
            "hsl(204, 70%, 41%)",
            "hsl(90, 56%, 71%)",
            "hsl(116, 56%, 40%)",
            "hsl(0, 91%, 79%)",
            "hsl(359, 79%, 50%)",
            "hsl(34, 98%, 71%)",
            "hsl(30, 100%, 50%)",
            "hsl(281, 28%, 77%)",
            "hsl(269, 43%, 42%)",
            "hsl(60, 100%, 80%)",
            "hsl(21, 63%, 42%)"
          ];
          return colors[index % colors.length];
        }
        case "custom-solid": {
          return this.options.edgeColorCustom || "#3b82f6";
        }
        case "rainbow":
        default: {
          const hue = ratio * 280;
          return `hsl(${hue}, 85%, 45%)`;
        }
      }
    }
    /**
     * Helper mapping HSL color strings to Hex representation.
     */
    hslToHex(hsl) {
      const matches = hsl.match(/hsl\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\%\s*,\s*(\d+(?:\.\d+)?)\%\s*\)/);
      if (!matches) return "#000000";
      let h = parseFloat(matches[1]);
      let s = parseFloat(matches[2]) / 100;
      let l = parseFloat(matches[3]) / 100;
      let c = (1 - Math.abs(2 * l - 1)) * s;
      let x = c * (1 - Math.abs(h / 60 % 2 - 1));
      let m = l - c / 2;
      let r = 0, g = 0, b = 0;
      if (0 <= h && h < 60) {
        r = c;
        g = x;
        b = 0;
      } else if (60 <= h && h < 120) {
        r = x;
        g = c;
        b = 0;
      } else if (120 <= h && h < 180) {
        r = 0;
        g = c;
        b = x;
      } else if (180 <= h && h < 240) {
        r = 0;
        g = x;
        b = c;
      } else if (240 <= h && h < 300) {
        r = x;
        g = 0;
        b = c;
      } else if (300 <= h && h < 360) {
        r = c;
        g = 0;
        b = x;
      }
      let rHex = Math.round((r + m) * 255).toString(16).padStart(2, "0");
      let gHex = Math.round((g + m) * 255).toString(16).padStart(2, "0");
      let bHex = Math.round((b + m) * 255).toString(16).padStart(2, "0");
      return `#${rHex}${gHex}${bHex}`;
    }
    /**
     * Cleans up simulation animation ticks and DOM references.
     */
    destroy() {
      this._eventsAbort?.abort();
      this.stopSimulation();
      if (this.container && this.svg && this.svg.parentNode === this.container) {
        if (this.svg !== this.container) {
          this.container.removeChild(this.svg);
        }
      }
    }
  };

  // src/hypergraph-view.js
  /*!
   * Contains hypergraph-plotter by Phileas Dazeley-Gaist, MIT License.
   * Copyright (c) Phileas Dazeley-Gaist
   * Permission is hereby granted, free of charge, to any person obtaining a copy
   * of this software and associated documentation files (the "Software"), to deal
   * in the Software without restriction, including without limitation the rights
   * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   * copies of the Software, and to permit persons to whom the Software is
   * furnished to do so, subject to the following conditions:
   * The above copyright notice and this permission notice shall be included in
   * all copies or substantial portions of the Software.
   * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
   * SOFTWARE.
   */
  function mount(container, { users, communities, period, onUser, onSettings, settings }) {
    const host = container.querySelector(".blob-canvas");
    const hint = container.querySelector(".graph-focus");
    const width = host.clientWidth || 760;
    const height = host.clientHeight || 460;
    const plot = new HypergraphPlotter(host, {
      width,
      height,
      physicsPlaying: false,
      layoutType: settings.layout,
      plotTheme: "name-labeled",
      vertexSize: 0.13,
      labelFontSize: 10,
      vertexOutlineWidth: 1.2,
      nodeFillType: "custom",
      nodeFillCustom: "#ffffff",
      showSubsetBoundary: settings.boundaries,
      boundaryScale: 2.1,
      blobOpacity: 0.11,
      blobOutlineWidth: 1.5,
      // The library's hub curves are a hyperedge representation, not reply edges.
      showSubsetEdge: settings.connections,
      edgeWidth: 1,
      showHyperedgeLabels: true,
      showHubs: false,
      allowPan: true,
      allowZoom: true,
      allowDrag: true,
      pinOnDrag: true,
      hidePinDashes: true,
      canvasBg: "white",
      kAttract: 0.08,
      kRepel: 7500,
      kHyperedgeRepel: 14e3,
      kCenter: 3e-3,
      damping: 0.85,
      maxSpeed: 8
    });
    plot.stopSimulation();
    const userById = new Map(users.map((u) => [String(u.u), u]));
    const groupById = new Map(communities.map((c) => [String(c.c), c]));
    let focusEdge = null, pinnedEdge = null, focusUser = null, suppressClick = false;
    const defaultHint = "\u60AC\u505C\u7528\u6237\u6216\u793E\u533A\u6807\u7B7E\u67E5\u770B\u771F\u5B9E\u5F52\u5C5E\uFF1B\u70B9\u51FB\u7528\u6237\u8FDB\u5165\u53C2\u4E0E\u8F68\u8FF9\u3002";
    const draw = plot.draw.bind(plot);
    function decorate() {
      const active = focusEdge !== null ? groupById.get(String(focusEdge)) : null;
      plot.verticesLayer.querySelectorAll(".vertex").forEach((el) => {
        const user = userById.get(el.dataset.id);
        if (!user) return;
        el.dataset.user = String(user.u);
        el.dataset.plotterNode = "true";
        el.setAttribute("role", "button");
        el.setAttribute("tabindex", "0");
        el.setAttribute("aria-label", `${user.label}\uFF0C${user.cs.length} \u4E2A\u753B\u9762\u793E\u533A\uFF0C\u67E5\u770B\u8F68\u8FF9`);
        el.querySelector("title").textContent = `${user.label}
${user.cs.map((c) => groupById.get(String(c))?.name).join("\u3001")}`;
        el.style.opacity = active && !user.cs.includes(active.c) ? ".12" : "1";
        const circle = el.querySelector("circle, rect");
        circle.setAttribute("stroke", focusUser === user.u ? "#162e29" : active?.color || "#536860");
        circle.setAttribute("stroke-width", focusUser === user.u ? "3" : "1.2");
      });
      [...plot.labelsLayer.children].forEach((el, i) => {
        el.style.opacity = active && !users[i].cs.includes(active.c) ? ".12" : "1";
      });
      plot.blobsLayer.querySelectorAll("path").forEach((el) => {
        const id = +el.dataset.id;
        const belongs = focusUser !== null && userById.get(String(focusUser)).cs.includes(id);
        el.setAttribute("fill-opacity", active ? id === active.c ? ".22" : ".025" : focusUser !== null ? belongs ? ".18" : ".025" : ".11");
        el.setAttribute("stroke-opacity", active ? id === active.c ? "1" : ".12" : focusUser !== null ? belongs ? "1" : ".12" : ".7");
        el.setAttribute("stroke-width", active?.c === id || belongs ? "2.4" : "1.5");
      });
      container.querySelectorAll("[data-edge-focus]").forEach((b) => {
        b.classList.toggle("focused", +b.dataset.edgeFocus === active?.c);
        b.setAttribute("aria-pressed", String(+b.dataset.edgeFocus === pinnedEdge));
      });
    }
    plot.draw = () => {
      draw();
      decorate();
    };
    plot.setData({
      vertices: users.map((u, i) => ({
        id: String(u.u),
        label: String(i + 1).padStart(2, "0"),
        x: width / 2 + 150 * Math.cos(i * 2.399963229728653),
        y: height / 2 + 150 * Math.sin(i * 2.399963229728653)
      })),
      hyperedges: communities.map((c) => ({
        id: String(c.c),
        label: c.name,
        color: c.color,
        vertices: users.filter((u) => u.cs.includes(c.c)).map((u) => String(u.u))
      }))
    });
    plot.zoomToFit(42);
    plot.svg.setAttribute("role", "group");
    plot.svg.setAttribute("aria-label", `${period} \u793E\u533A\u8D85\u56FE\uFF0C${users.length} \u4F4D\u5C55\u793A\u7528\u6237`);
    function edgeFocus(id) {
      focusEdge = id;
      focusUser = null;
      const group = id === null ? null : groupById.get(String(id));
      hint.textContent = group ? `${group.name} \xB7 \u5F53\u524D\u753B\u9762 ${users.filter((u) => u.cs.includes(group.c)).length} \u4EBA \xB7 \u672C\u671F\u5168\u6837\u672C ${group.size.toLocaleString()} \u4EBA\u3002\u9AD8\u4EAE\u5706\u70B9\u624D\u662F\u771F\u5B9E\u6210\u5458\u3002` : defaultHint;
      decorate();
    }
    plot.onNodeDragged = (_, stage) => {
      if (stage === "start") suppressClick = false;
      if (stage === "drag") suppressClick = true;
    };
    plot.svg.addEventListener("click", (e) => {
      if (suppressClick) {
        suppressClick = false;
        return;
      }
      const vertex = e.target.closest(".vertex");
      if (vertex) onUser(+vertex.dataset.id);
    });
    plot.svg.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && e.target.closest(".vertex")) {
        e.preventDefault();
        onUser(+e.target.closest(".vertex").dataset.id);
      }
    });
    plot.svg.addEventListener("pointerover", (e) => {
      const vertex = e.target.closest(".vertex");
      if (!vertex) return;
      const user = userById.get(vertex.dataset.id);
      focusUser = user.u;
      focusEdge = null;
      hint.textContent = `${user.label} \xB7 \u771F\u5B9E\u5F52\u5C5E\uFF1A${user.cs.map((c) => groupById.get(String(c)).name).join("\u3001")}`;
      decorate();
    });
    plot.svg.addEventListener("pointerleave", () => edgeFocus(pinnedEdge));
    container.querySelectorAll("[data-edge-focus]").forEach((b) => {
      const c = +b.dataset.edgeFocus;
      b.onpointerenter = b.onfocus = () => edgeFocus(c);
      b.onpointerleave = b.onblur = () => edgeFocus(pinnedEdge);
      b.onclick = () => {
        pinnedEdge = pinnedEdge === c ? null : c;
        edgeFocus(pinnedEdge);
      };
    });
    container.querySelector('[data-plot-control="layout"]').onchange = (e) => {
      settings.layout = e.target.value;
      onSettings(settings);
      plot.setOptions({ layoutType: settings.layout });
      if (settings.layout === "spring-embedding") for (let i = 0; i < 180; i++) plot.physicsLayout.tick();
      plot.draw();
      plot.zoomToFit(42);
    };
    for (const [key, option] of [["boundaries", "showSubsetBoundary"], ["connections", "showSubsetEdge"]]) {
      container.querySelector(`[data-plot-control="${key}"]`).onchange = (e) => {
        settings[key] = e.target.checked;
        onSettings(settings);
        plot.setOptions({ [option]: settings[key] });
      };
    }
    container.querySelector('[data-zoom="in"]').onclick = () => plot.adjustZoom(1.2);
    container.querySelector('[data-zoom="out"]').onclick = () => plot.adjustZoom(1 / 1.2);
    container.querySelector('[data-zoom="fit"]').onclick = () => plot.zoomToFit(42);
    container.querySelector("[data-plot-export]").onclick = () => {
      const svg = plot.getSVGString();
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob), link = document.createElement("a");
      link.href = url;
      link.download = `crossing-${period}-hypergraph.svg`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1e3);
    };
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => plot.zoomToFit(42));
    resize?.observe(host);
    edgeFocus(null);
    return { destroy() {
      resize?.disconnect();
      plot.destroy();
    }, plot };
  }
  window.CrossingHypergraph = { mount };
})();
