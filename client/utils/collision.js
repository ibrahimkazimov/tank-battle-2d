/**
 * Checks collision between two rectangular bounds
 */
export function checkCollision(rect1, rect2) {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  }
  
  /**
   * Calculates distance between two points
   */
  export function getDistance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
  }

  /**
   * Checks collision between a circle and a rectangle
   */
  export function checkCircleRectCollision(circle, rect) {
    // Find the closest point on the rectangle to the circle's center
    const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
    
    // Calculate the distance between the circle's center and the closest point
    const distanceX = circle.x - closestX;
    const distanceY = circle.y - closestY;
    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
    
    // If the distance is less than the circle's radius, there's a collision
    return distance < circle.radius;
  }