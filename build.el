;; Set up package installation
(require 'package)
(setq package-user-dir (expand-file-name "./.packages"))
(setq package-archives '(("melpa" . "https://melpa.org/packages/")
                         ("elpa" . "https://elpa.gnu.org/packages/")))

;; Initialize the package system
(package-initialize)
(unless package-archive-contents
  (package-refresh-contents))

;; Load dependencies
(package-install 'htmlize)
(load-file "ox-tufte.el")
(require 'ox-publish)

;; Prevent backup files from being created
(setq make-backup-files nil)

;; Customize the HTML output
(setq org-html-divs '((preamble "div" "preamble")
                      (content "article" "content")
                      (postamble "div" "postamble"))
      org-html-postamble 'nil
      org-html-validation-link nil            ;; Don't show validation link
      org-html-head-include-scripts nil       ;; Use our own scripts
      org-html-head-include-default-style nil ;; Use our own styles
      org-html-head "<link rel=\"stylesheet\" href=\"res/tufte.min.css\" />"
      org-html-container-element "section"
      org-html-doctype "html5"
      org-html-html5-fancy t)

;; Define the publishing project
(setq org-publish-project-alist
      (list
       (list "tzcl.me"
             :recursive t
             :base-directory "content"
             :publishing-directory "public"
             :publishing-function 'org-html-publish-to-tufte-html
             :section-numbers nil
             :with-toc nil)))

;; Generate HTML files
(org-publish-all t)

(message "Build complete!")
