;;; ox-tufte.el --- Tufte HTML org-mode export backend

;; Copyright (C) 2022 Toby Law

;; Author: Toby Law
;; Description: An org exporter for Tufte HTML
;; Keywords: outlines, processes
;; Version: 1.0.0
;; Package-Requires: ((emacs "27.2"))
;; URL: https://github.com/tzcl/ox-tufte

;; This file is not part of GNU Emacs.

;; GNU Emacs is free software: you can redistribute it and/or modify
;; it under the terms of the GNU General Public License as published by
;; the Free Software Foundation, either version 3 of the License, or
;; (at your option) any later version.

;; GNU Emacs is distributed in the hope that it will be useful,
;; but WITHOUT ANY WARRANTY; without even the implied warranty of
;; MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
;; GNU General Public License for more details.

;; You should have received a copy of the GNU General Public License
;; along with GNU Emacs.  If not, see <http://www.gnu.org/licenses/>.

;;; Commentary:

;; This is an export backend for Org-mode that exports buffers to HTML that is
;; compatible with Tufte CSS - https://edwardtufte.github.io/tufte-css/ - out of
;; the box (meaning no CSS modifications needed).

;;; Code:

(require 'ox)
(require 'ox-html)

;;; Define Back-End

(org-export-define-derived-backend 'tufte-html 'html
  :menu-entry
  '(?T "Export to Tufte-HTML"
       ((?T "To temporary buffer"
            (lambda (a s v b) (org-tufte-export-to-buffer a s v)))
        (?t "To file" (lambda (a s v b) (org-tufte-export-to-file a s v)))
        (?o "To file and open"
            (lambda (a s v b)
              (if a (org-tufte-export-to-file t s v)
                (org-open-file (org-tufte-export-to-file nil s v)))))))
  :translate-alist '((center-block . org-tufte-center-block)
                     (footnote-reference . org-tufte-footnote-reference)
                     (headline . org-tufte-headline)
                     (link . org-tufte-maybe-margin-note-link)
                     (quote-block . org-tufte-quote-block)
                     (section . org-tufte-section)
                     (src-block . org-tufte-src-block)
                     (verse-block . org-tufte-verse-block)))

;;; Transcode Functions

(defun org-tufte-section (section contents info)
  "Just return the content, don't wrap in a div."
  contents)

(defun org-tufte-headline (headline contents info)
  (unless (org-element-property :footnote-section-p headline)
    (let* ((numberedp (org-export-numbered-headline-p headline info))
           (numbers (org-export-get-headline-number headline info))
           (level (+ (org-export-get-relative-level headline info)
                     (1- (plist-get info :html-toplevel-hlevel))))
           (todo (and (plist-get info :with-todo-keywords)
                      (let ((todo (org-element-property :todo-keyword headline)))
                        (and todo (org-export-data todo info)))))
           (todo-type (and todo (org-element-property :todo-type headline)))
           (priority (and (plist-get info :with-priority)
                          (org-element-property :priority headline)))
           (text (org-export-data (org-element-property :title headline) info))
           (tags (and (plist-get info :with-tags)
                      (org-export-get-tags headline info)))
           (full-text (funcall (plist-get info :html-format-headline-function)
                               todo todo-type priority text tags info))
           (contents (or contents ""))
           (id (org-html--reference headline info))
           (formatted-text
            (if (plist-get info :html-self-link-headlines)
                (format "<a href=\"#%s\">%s</a>" id full-text)
              full-text)))
      (if (org-export-low-level-p headline info)
          ;; This is a deep sub-tree: export it as a list item.
          (let* ((html-type (if numberedp "ol" "ul")))
            (concat
             (and (org-export-first-sibling-p headline info)
                  (apply #'format "<%s class=\"org-%s\">\n"
                         (make-list 2 html-type)))
             (org-html-format-list-item
              contents (if numberedp 'ordered 'unordered)
              nil info nil (concat (org-html--anchor id nil nil info) formatted-text)) "\n"
             (and (org-export-last-sibling-p headline info)
                  (format "</%s>\n" html-type))))
        ;; Standard headline.  Export it as a section.
        (let ((extra-class
               (org-element-property :HTML_CONTAINER_CLASS headline))
              (headline-class
               (org-element-property :HTML_HEADLINE_CLASS headline))
              (headline-container (org-html--container headline info)))
          (concat
           (if (not (equal headline-container "div"))
               (format "<%s id=\"%s\" class=\"%s\">"
                       headline-container
                       id
                       extra-class))
           (format "\n<h%d id=\"%s\"%s>%s</h%d>\n"
                   level
                   id
                   (if (not headline-class) ""
                     (format " class=\"%s\"" headline-class))
                   (concat
                    (and numberedp
                         (format "<span class=\"section-number-%d\">%s</span> "
                                 level
                                 (concat (mapconcat #'number-to-string numbers ".") ".")))
                    formatted-text)
                   level)
           contents
           (if (not (equal headline-container "div"))
               (format "</%s>" headline-container))))))))

(defun org-tufte-quote-block (quote-block contents info)
  "Transform a quote block into an epigraph in Tufte HTML style"
  ;; TODO: review -- should every blockquote be wrapped in its own div?
  (format "<div class=\"epigraph\"><blockquote>\n%s\n%s</blockquote></div>"
          contents
          (if (org-element-property :name quote-block)
              (format "<footer>%s</footer>"
                      (org-element-property :name quote-block))
            "")))

(defun org-tufte-verse-block (verse-block contents info)
  "Transcode a VERSE-BLOCK element from Org to HTML.
CONTENTS is verse block contents.  INFO is a plist holding
contextual information."
  ;; Replace each newline character with line break.  Also replace
  ;; each blank line with a line break.
  (setq contents (replace-regexp-in-string
                  "^ *\\\\\\\\$" (format "%s\n" (org-html-close-tag "br" nil info))
                  (replace-regexp-in-string
                   "\\(\\\\\\\\\\)?[ \t]*\n"
                   (format "%s\n" (org-html-close-tag "br" nil info)) contents)))
  ;; Replace each white space at beginning of a line with a
  ;; non-breaking space.
  (while (string-match "^[ \t]+" contents)
    (let* ((num-ws (length (match-string 0 contents)))
           (ws (let (out) (dotimes (i num-ws out)
                            (setq out (concat out "&#xa0;"))))))
      (setq contents (replace-match ws nil t contents))))
  (format "<div class=\"epigraph\"><blockquote>\n<p>%s</p>\n%s</blockquote></div>"
          contents
          (if (org-element-property :name verse-block)
              (format "<footer>%s</footer>"
                      (org-element-property :name verse-block))
            "")))

(defun org-tufte-center-block (center-block contents info)
  "Transcode a CENTER-BLOCK from Org to HTML.
CONTENTS is center block contents. INFO is a plist holding
contextual information."
  ;; Indent the contents and optionally allow for a citation
  ;; REVIEW: see if there's a way to pass in a URL
  (let ((text (org-element-property :name center-block)))
    (format "<blockquote>%s\n%s</blockquote>\n"
        contents
        (and text
               (format "<footer>%s</footer>\n" text)))))


(defun org-tufte-footnote-reference (footnote-reference contents info)
  "Create a footnote according to the tufte css format.
FOOTNOTE-REFERENCE is the org element, CONTENTS is nil. INFO is a
plist holding contextual information."
  (format
   (concat "<label for=\"%s\" class=\"margin-toggle sidenote-number\"></label>"
           "<input type=\"checkbox\" id=\"%s\" class=\"margin-toggle\"/>"
           "<span class=\"sidenote\">%s</span>")
   (org-export-get-footnote-number footnote-reference info)
   (org-export-get-footnote-number footnote-reference info)
   (let ((fn-data (org-trim
                   (org-export-data
                    (org-export-get-footnote-definition footnote-reference info)
                    info))))
     ;; footnotes must have spurious <p> tags removed or they will not work
     (replace-regexp-in-string "</?p.*>" "" fn-data))))

(defun org-tufte-maybe-margin-note-link (link desc info)
  "Render LINK as a margin note if it starts with `mn:', for
  example, `[[mn:1][this is some text]]' is margin note 1 that
  will show \"this is some text\" in the margin.

If it does not, it will be passed onto the original function in
order to be handled properly. DESC is the description part of the
link. INFO is a plist holding contextual information."
  ;; REVIEW: desc gets escaped rather than passed through ox-html
  (let ((path (split-string (org-element-property :path link) ":")))
      (if (and (string= (org-element-property :type link) "fuzzy")
               (string= (car path) "mn"))
          (format
           (concat "<label for=\"%s\" class=\"margin-toggle\">&#8853;</label>"
                   "<input type=\"checkbox\" id=\"%s\" class=\"margin-toggle\"/>"
                   "<span class=\"marginnote\">%s</span>")
           (cadr path) (cadr path)
           (replace-regexp-in-string "</?p.*>" "" desc))
        (org-html-link link desc info))))

(defun org-tufte-src-block (src-block contents info)
  "Transcode SRC-BLOCK element into Tufte HTML format. CONTENTS
is nil. INFO is a plist used as a communication channel."
  (format "<pre class=\"code\"><code>%s</code></pre>"
          (org-html-format-code src-block info)))

(defun org-html-toc (depth info &optional scope)
  "Overwrite toc generation to remove heading"
  (let ((toc-entries
         (mapcar (lambda (headline)
                   (cons (org-html--format-toc-headline headline info)
                         (org-export-get-relative-level headline info)))
                 (org-export-collect-headlines info depth scope))))
    (when toc-entries
      (let ((toc (concat "<div id=\"text-table-of-contents\" role=\"doc-toc\">"
                         (org-html--toc-text toc-entries)
                         "</div>\n")))
        (if scope toc
          (let ((outer-tag (if (org-html--html5-fancy-p info)
                               "nav"
                             "div")))
            (concat (format "<%s id=\"table-of-contents\" role=\"doc-toc\">\n" outer-tag)
                    (let ((top-level (plist-get info :html-toplevel-hlevel)))
                      (format "<h%d>%s</h%d>\n"
                              top-level
                              ""
                              top-level))
                    toc
                    (format "</%s>\n" outer-tag))))))))

;;; Export functions

;;;###autoload
(defun org-tufte-export-to-buffer (&optional async subtreep visible-only)
  "Export current buffer to a Tufte HTML buffer.

If narrowing is active in the current buffer, only export its
narrowed part.

If a region is active, export that region.

A non-nil optional argument ASYNC means the process should happen
asynchronously.  The resulting buffer should be accessible
through the `org-export-stack' interface.

When optional argument SUBTREEP is non-nil, export the sub-tree
at point, extracting information from the headline properties
first.

When optional argument VISIBLE-ONLY is non-nil, don't export
contents of hidden elements.

Export is done in a buffer named \"*Org Tufte Export*\", which will
be displayed when `org-export-show-temporary-export-buffer' is
non-nil."
  (interactive)
  (let (;; need to bind this because tufte treats footnotes specially, so we
        ;; don't want to display them at the bottom
        (org-html-footnotes-section "<!-- %s --><!-- %s -->"))
    (org-export-to-buffer 'tufte-html "*Org Tufte Export*"
      async subtreep visible-only nil nil (lambda () (text-mode)))))

;;;###autoload
(defun org-tufte-export-to-file (&optional async subtreep visible-only)
  "Export current buffer to a Tufte HTML file.

If narrowing is active in the current buffer, only export its
narrowed part.

If a region is active, export that region.

A non-nil optional argument ASYNC means the process should happen
asynchronously.  The resulting file should be accessible through
the `org-export-stack' interface.

When optional argument SUBTREEP is non-nil, export the sub-tree
at point, extracting information from the headline properties
first.

When optional argument VISIBLE-ONLY is non-nil, don't export
contents of hidden elements.

Return output file's name."
  (interactive)
  (let ((outfile (org-export-output-file-name ".html" subtreep))
        ;; need to bind this because tufte treats footnotes specially, so we
        ;; don't want to display them at the bottom
        (org-html-footnotes-section "<!-- %s --><!-- %s -->"))
    (org-export-to-file 'tufte-html outfile async subtreep visible-only)))

;;; publishing function

;;;###autoload
(defun org-html-publish-to-tufte-html (plist filename pub-dir)
  "Publish an org file to Tufte-styled HTML.

PLIST is the property list for the given project.  FILENAME is
the filename of the Org file to be published.  PUB-DIR is the
publishing directory.

Return output file name."
  (let ((org-html-footnotes-section "<!-- %s --><!-- %s -->"))
    (org-publish-org-to 'tufte-html filename
                        (concat "." (or (plist-get plist :html-extension)
                                        org-html-extension
                                        "html"))
                        plist pub-dir)))

(provide 'ox-tufte)

;;; ox-tufte.el ends here
