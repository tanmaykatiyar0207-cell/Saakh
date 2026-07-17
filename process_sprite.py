from PIL import Image

def process():
    img = Image.open('sprite_raw.png').convert('RGBA')
    data = img.getdata()
    
    # Make white background transparent
    new_data = []
    for d in data:
        if d[0] > 240 and d[1] > 240 and d[2] > 240:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(d)
    img.putdata(new_data)
    
    width, height = img.size
    frame_width = width // 4
    
    # We will just ensure the image width is perfectly divisible by 4
    new_width = frame_width * 4
    img = img.crop((0, 0, new_width, height))
    img.save('sprite.png', 'PNG')
    print("Sprite saved successfully.")

if __name__ == '__main__':
    process()
