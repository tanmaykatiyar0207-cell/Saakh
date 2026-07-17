from PIL import Image

def extract():
    img = Image.open('shop.jpg').convert('RGBA')
    width, height = img.size

    stall_img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    fg_img = Image.new('RGBA', (width, height), (0, 0, 0, 0))

    stall_pixels = stall_img.load()
    fg_pixels = fg_img.load()
    orig_pixels = img.load()

    for y in range(height):
        for x in range(width):
            r, g, b, a = orig_pixels[x, y]
            
            # Key out white background (very close to white)
            if r > 252 and g > 252 and b > 252:
                continue

            # Determine if it belongs to the foreground
            # Foreground includes bottom pots (left/right) and floor fruits
            is_fg = False
            
            # Left pot & plants
            if x < 380 and y > 600:
                is_fg = True
            # Right pot & plants
            elif x > 640 and y > 600:
                is_fg = True
            # Floor fruits in the middle
            elif y > 720:
                is_fg = True

            if is_fg:
                fg_pixels[x, y] = (r, g, b, a)
            else:
                stall_pixels[x, y] = (r, g, b, a)

    # Save images
    stall_img.save('stall.png', 'PNG')
    fg_img.save('foreground.png', 'PNG')
    print("Layers successfully extracted!")

if __name__ == '__main__':
    extract()
