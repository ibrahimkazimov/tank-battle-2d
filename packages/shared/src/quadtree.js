/**
 * Quadtree implementation for spatial partitioning to optimize collision detection.
 */
export class Quadtree {
  /**
   * @param {Object} bounds - { x, y, width, height }
   * @param {number} capacity - Maximum objects per node before subdividing
   * @param {number} maxLevels - Maximum depth of the tree
   * @param {number} level - Current depth level
   */
  constructor(bounds, capacity = 4, maxLevels = 5, level = 0) {
    this.bounds = bounds;
    this.capacity = capacity;
    this.maxLevels = maxLevels;
    this.level = level;
    this.objects = [];
    this.nodes = [];
  }

  /**
   * Clears the quadtree
   */
  clear() {
    this.objects = [];
    for (let i = 0; i < this.nodes.length; i++) {
      if (this.nodes[i]) {
        this.nodes[i].clear();
      }
    }
    this.nodes = [];
  }

  /**
   * Splits the node into 4 subnodes
   */
  subdivide() {
    const subWidth = this.bounds.width / 2;
    const subHeight = this.bounds.height / 2;
    const x = this.bounds.x;
    const y = this.bounds.y;

    // Top-right
    this.nodes[0] = new Quadtree(
      { x: x + subWidth, y: y, width: subWidth, height: subHeight },
      this.capacity,
      this.maxLevels,
      this.level + 1,
    );
    // Top-left
    this.nodes[1] = new Quadtree(
      { x: x, y: y, width: subWidth, height: subHeight },
      this.capacity,
      this.maxLevels,
      this.level + 1,
    );
    // Bottom-left
    this.nodes[2] = new Quadtree(
      { x: x, y: y + subHeight, width: subWidth, height: subHeight },
      this.capacity,
      this.maxLevels,
      this.level + 1,
    );
    // Bottom-right
    this.nodes[3] = new Quadtree(
      { x: x + subWidth, y: y + subHeight, width: subWidth, height: subHeight },
      this.capacity,
      this.maxLevels,
      this.level + 1,
    );
  }

  /**
   * Determine which node the object belongs to.
   * -1 means object cannot completely fit within a subnode and belongs to the parent node.
   * @param {Object} rect - { x, y, width, height }
   * @returns {number} index of the subnode (0-3), or -1
   */
  getIndex(rect) {
    let index = -1;
    const verticalMidpoint = this.bounds.x + this.bounds.width / 2;
    const horizontalMidpoint = this.bounds.y + this.bounds.height / 2;

    // Object can completely fit within the top quadrants
    const topQuadrant =
      rect.y < horizontalMidpoint && rect.y + rect.height < horizontalMidpoint;
    // Object can completely fit within the bottom quadrants
    const bottomQuadrant = rect.y > horizontalMidpoint;

    // Object can completely fit within the left quadrants
    if (rect.x < verticalMidpoint && rect.x + rect.width < verticalMidpoint) {
      if (topQuadrant) {
        index = 1;
      } else if (bottomQuadrant) {
        index = 2;
      }
    }
    // Object can completely fit within the right quadrants
    else if (rect.x > verticalMidpoint) {
      if (topQuadrant) {
        index = 0;
      } else if (bottomQuadrant) {
        index = 3;
      }
    }

    return index;
  }

  /**
   * Insert the object into the quadtree. If the node
   * exceeds the capacity, it will split and add all
   * objects to their corresponding subnodes.
   * @param {Object} item - { x, y, width, height, ...rest }
   */
  insert(item) {
    if (this.nodes.length > 0) {
      const index = this.getIndex(item);

      if (index !== -1) {
        this.nodes[index].insert(item);
        return;
      }
    }

    this.objects.push(item);

    if (this.objects.length > this.capacity && this.level < this.maxLevels) {
      if (this.nodes.length === 0) {
        this.subdivide();
      }

      let i = 0;
      while (i < this.objects.length) {
        const index = this.getIndex(this.objects[i]);
        if (index !== -1) {
          this.nodes[index].insert(this.objects.splice(i, 1)[0]);
        } else {
          i++;
        }
      }
    }
  }

  /**
   * Return all objects that could collide with the given object
   * @param {Object} rect - { x, y, width, height }
   * @returns {Array} List of potential candidates
   */
  retrieve(rect) {
    let index = this.getIndex(rect);
    let returnObjects = this.objects;

    if (this.nodes.length > 0) {
      // If fits in a specific subnode, retrieve from it
      if (index !== -1) {
        returnObjects = returnObjects.concat(this.nodes[index].retrieve(rect));
      } else {
        // If it overlaps multiple subnodes, we must check all subnodes it overlaps
        // For simplicity, we can just return all subnodes' objects if it's not strictly in one
        for (let i = 0; i < this.nodes.length; i++) {
          returnObjects = returnObjects.concat(this.nodes[i].retrieve(rect));
        }
      }
    }

    return returnObjects;
  }
}
