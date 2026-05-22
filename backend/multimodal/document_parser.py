import os
from unstructured.partition.pdf import partition_pdf
import base64

class DocumentParser:
    def parse_pdf(self, file_path: str) -> str:
        """
        Parse a PDF file and extract text and structured content.
        Uses unstructured.io.
        """
        try:
            elements = partition_pdf(filename=file_path)
            text_content = "\n\n".join([str(el) for el in elements])
            return text_content
        except Exception as e:
            print(f"Error parsing PDF: {e}")
            return ""

    def encode_image(self, image_path: str) -> str:
        """
        Encode an image to base64 for Vision API.
        """
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')
