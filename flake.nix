{
<<<<<<< HEAD
  description = "A Nix-flake-based LaTeX development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    { self
    , nixpkgs
    , flake-utils
    }:

    flake-utils.lib.eachDefaultSystem (system:
    let
      pkgs = import nixpkgs { inherit system; };
    in
    {
      devShells.default = pkgs.mkShell {
        packages = with pkgs; [
          texlive.combined.scheme-full
        ];
      };
    });
=======
  description = "LaTeX flake";

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

  
>>>>>>> 717524ad1dd5fc3257abc126bf8894f6d6632fbf
}
