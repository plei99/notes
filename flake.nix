{
  description = "A Nix-flake-based LaTeX development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { nixpkgs, flake-utils, ... }: 
    flake-utils.lib.eachDefaultSystem (system:
      let pkgs = nixpkgs.legacyPackages.${system}; in
      with pkgs; {
        devShells.default = mkShell {
          buildInputs = [ 
          texlive.combined.scheme-full 
          libertinus
          ];
        };
      }
    );

  
}
