
export const SUPPORTED_FILE_TYPES = {
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'application/pdf': ['.pdf'],
  'application/json': ['.json']
};

export const SAMPLE_PROMPT = `
Analyze the provided document content. 
Structure it into a JSON object designed for a bilingual interactive web visualization. 

CRITICAL INSTRUCTIONS:
1. **METADATA EXTRACTION**: 
   - Extract the list of **authors** (names only).
   - Extract the **publication date** (YYYY-MM-DD or just YYYY). If explicit date is not found, try to infer the Year. If unknown, use null.
   - Extract the list of **references/citations** (just the titles of the cited papers if possible, or short citations).
2. **NO REPETITION**: Process the document linearly. Do NOT repeat the same section content under different names. Each part of the document must appear only once.
3. **STRICT STRUCTURE**: Detect the actual Table of Contents of the document. Use that exact structure.
4. **DIAGRAM RECONSTRUCTION**: If the document contains diagrams, flowcharts, architectures, or process graphs (Figures):
   - Try to reconstruct them as a **Mermaid.js** graph (type: 'mermaid').
   - Put the Mermaid code in the 'content' field.
   - Example: "graph TD; A[Client] --> B[Load Balancer]; B --> C[Server01]; B --> D[Server02]"
5. **IMAGE REFERENCES & EXTRACTION**: For any figure, chart, or image that cannot be perfectly reconstructed with Mermaid (e.g., photos, complex plots, UI screenshots):
   - Use type 'image_reference'.
   - **MANDATORY**: Identify the **pageNumber** (integer, 1-based) where this image appears.
   - **MANDATORY**: Identify the **boundingBox** of the image on that page as [ymin, xmin, ymax, xmax] relative coordinates (0.0 to 1.0).
   - Describe clearly what the image depicts in the 'description'.
6. **DATA CHARTS**: Only generate a 'bar_chart' or 'pie_chart' if the text contains EXPLICIT NUMERICAL DATA tables.

The JSON must have this schema:
{
  "title": { "original": "Doc Title", "spanish": "Título Doc" },
  "authors": ["Author Name 1", "Author Name 2"],
  "publicationDate": "2023",
  "references": ["Cited Paper Title 1", "Cited Paper Title 2"],
  "mainSummary": { "original": "Executive summary...", "spanish": "Resumen ejecutivo..." },
  "sections": [
    {
      "id": "unique_id_1",
      "title": { "original": "Section Title", "spanish": "Título Sección" },
      "summary": { "original": "Short summary", "spanish": "Resumen corto" },
      "content": { "original": "Full markdown content...", "spanish": "Contenido completo markdown..." },
      "icon": "One of: 'book', 'beaker', 'code', 'users', 'settings', 'bulb', 'target', 'zap', 'alert', 'image'",
      "colorTheme": "One of: 'blue', 'green', 'purple', 'orange', 'red', 'indigo'",
      "keyPoints": { 
        "original": ["Key point 1"], 
        "spanish": ["Punto clave 1"] 
      },
      "visuals": [
        {
          "id": "vis_1",
          "type": "one of: 'table', 'bar_chart', 'pie_chart', 'image_reference', 'mermaid'",
          "title": { "original": "Table/Figure Title", "spanish": "Título Tabla/Figura" },
          "description": { "original": "Description of the graphic", "spanish": "Descripción del gráfico" },
          "content": "Markdown, Mermaid Code, or extra details.", 
          "pageNumber": 1,
          "boundingBox": [0.1, 0.1, 0.5, 0.5],
          "chartData": {
            "labels": ["Item A", "Item B"],
            "values": [10, 20],
            "unit": "% or $"
          }
        }
      ]
    }
  ]
}
`;
