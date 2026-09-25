import os, qrcode
from qrcode.image.pil import PilImage
url = os.environ.get("DEMO_URL", "https://COMPTE-mourchid-jibaya.hf.space")
q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=2, box_size=16)
q.add_data(url); q.make(fit=True)
q.make_image(fill_color="#13233F", back_color="white").save("img/qr_demo.png")
print("QR →", url)
