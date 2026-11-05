// docx-preview copies a resume's hyperlink targets into <a href> unfiltered, so an uploaded
// .docx can carry a javascript: link that runs on our origin (where the bearer token lives).
// Everything docx-preview renders goes through this before it reaches the page.
const SAFE_LINK = /^(https?:|mailto:|#)/i;
const SAFE_SOURCE = /^(blob:|data:image\/)/i;
const BLOCKED_TAGS = "script, iframe, frame, frameset, object, embed, base, form, meta, link";
const SOURCE_ATTRIBUTES = new Set(["src", "srcset", "action", "formaction", "data", "poster"]);

export function sanitizeRenderedDocx(root) {
  root.querySelectorAll(BLOCKED_TAGS).forEach((element) => element.remove());
  root.querySelectorAll("*").forEach((element) => {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      if (name.startsWith("on")) {
        element.removeAttribute(attribute.name);
      } else if (name === "href" || name.endsWith(":href")) {
        if (!SAFE_LINK.test(value)) element.removeAttribute(attribute.name);
      } else if (SOURCE_ATTRIBUTES.has(name)) {
        if (!SAFE_SOURCE.test(value)) element.removeAttribute(attribute.name);
      }
    }
    const href = element.getAttribute("href");
    if (element.tagName.toLowerCase() === "a" && href && !href.startsWith("#")) {
      element.setAttribute("target", "_blank");
      element.setAttribute("rel", "noopener noreferrer");
    }
  });
}
