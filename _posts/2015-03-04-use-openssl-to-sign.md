---
layout: post
title: 使用openssl进行文件或字符串的签名和认证
tag: [Linux,OpenSSL,Sign]
---

<!--break-->

## sign.c

```c
/* gcc sign.c -o sign -lcrypto */

#include <stdio.h>
#include <stdlib.h>

#include <openssl/bio.h>
#include <openssl/err.h>
#include <openssl/evp.h>
#include <openssl/objects.h>
#include <openssl/pem.h>

#define _INPUT_FILE_    (0)

#undef BUFSIZE
#define BUFSIZE	(1024*8)

#define apps_startup() \
	do { \
        CRYPTO_malloc_init(); \
		ERR_load_crypto_strings(); \
        OpenSSL_add_all_algorithms(); \
    } while(0)
#define apps_shutdown() \
	do { \
		OBJ_cleanup(); \
        EVP_cleanup(); \
		CRYPTO_cleanup_all_ex_data(); \
        ERR_remove_thread_state(NULL); \
		ERR_free_strings(); \
    } while(0)

#define LOG_INIT() \
    if ((bio_err=BIO_new(BIO_s_file())) != NULL) \
        BIO_set_fp(bio_err,stderr,BIO_NOCLOSE|BIO_FP_TEXT);
#define LOGE(args...) \
    BIO_printf(bio_err, #args);\
    ERR_print_errors(bio_err);

static BIO *bio_err;

static EVP_PKEY *load_key(const char *file)
{
    BIO *key = NULL;
    EVP_PKEY *pkey = NULL;

    key = BIO_new(BIO_s_file());
    if (key != NULL) {
        if (BIO_read_filename(key,file) <= 0) {
            LOGE("Error opening %s\n", file);
        } else {
            pkey=PEM_read_bio_PrivateKey(key,NULL, NULL, NULL);
        }
    } else {
        LOGE("BIO_new fail");
    }

    if (key != NULL) BIO_free(key);
    return(pkey);
}

static int do_sign(const char *infile, BIO *bmd, const char *outfile)
{
    unsigned char *buf=NULL;
    size_t len = BUFSIZE;

    if ((buf=(unsigned char *)OPENSSL_malloc(BUFSIZE)) == NULL) {
        LOGE("out of memory\n");
    } else {

#if _INPUT_FILE_
        BIO *in = BIO_new(BIO_s_file());
#else
        BIO *in = BIO_new_mem_buf((void*)infile, -1);
#endif
        if(in != NULL) {
            /* appends the BIO(in) to (bmd), it returns (bmd). */
            BIO *inp=BIO_push(bmd,in);

#if _INPUT_FILE_
            /* set the file BIO(in) to use infile for reading */
            if (BIO_read_filename(in,infile) <= 0) {
                perror(infile);
            } else {
                int i = 1;
                while(i > 0) {
                    /*  read BUFSIZE bytes from BIO inp 
                        and places the data in buf. */
                    i = BIO_read(inp, (char *)buf, BUFSIZE);
                    if(i < 0) {
                        LOGE("Read Error in input file\n");
                        return 1;
                    }
                }
#else
            {
                BIO_read(inp, (char *)buf, BUFSIZE);
#endif

                EVP_MD_CTX *ctx;
                /* get the digest BIOs context from inp into ctx. */
                BIO_get_md_ctx(inp, &ctx);
                /* signs the data in ctx, places the signature in buf. */
                if(EVP_DigestSignFinal(ctx, buf, &len) == 0) {
                    LOGE("Error Signing Data\n");
                    return -1;
                }

                BIO *out = BIO_new_file(outfile, "wb");
                if(out == NULL) {
                    LOGE("Error opening output file %s\n",
                        outfile);
                } else {
                    BIO_write(out, buf, len);
                    BIO_free_all(out);
                }
            }
            BIO_free(in);
        }

        OPENSSL_cleanse(buf,BUFSIZE);
        OPENSSL_free(buf);
    }

    return 0;
}

int main(int argc, char **argv)
{
    const EVP_MD *md=NULL;
    BIO *bmd=NULL;
    EVP_PKEY *sigkey = NULL;

    const char *outfile = NULL;
    const char *keyfile = NULL;
    const char *infile = NULL;

    if ( argc < 4) {
        printf(
            "\nUsage:\n\t%s <pem> <in> <out>\n"
#if _INPUT_FILE_
            "Example:\n\t%s privkey.pem foo.png foo.png.sig\n\n",
#else
            "Example:\n\t%s privkey.pem \"abcdef\" foo.sig\n\n",
#endif
            argv[0], argv[0]);
        return -1;
    } else {
        keyfile = argv[1];
        infile  = argv[2];
        outfile = argv[3];
    }

    apps_startup();

    LOG_INIT();

    md = EVP_sha1();
    if (md != NULL) {

        sigkey = load_key(keyfile);
        if (sigkey != NULL) {
            EVP_MD_CTX *mctx = NULL;
            
            /* returns the message digest BIO method. 
            This is a filter BIO that digests any data passed through it, 
            it is a BIO wrapper for the digest routines EVP_DigestSignInit(), 
            and EVP_DigestSignFinal(). */
            bmd=BIO_new(BIO_f_md());
            if (bmd == NULL) {
                LOGE("BIO_new fail");
            } else {
                /* get the digest BIOs context from bmd into mctx. */
                if (!BIO_get_md_ctx(bmd, &mctx)) {
                    LOGE("Error getting context\n");
                } else {
                    /* sets up signing context mctx to use digest type(md) from
                     private key sigkey. */
                    int r = EVP_DigestSignInit(
                                mctx, NULL, md, NULL, sigkey);
                    if (r == 0) {
                        LOGE("Error setting context\n");
                    } else {
                        do_sign(infile, bmd, outfile);
                    }
                }
                (void)BIO_reset(bmd);
                BIO_free(bmd);
            }
            EVP_PKEY_free(sigkey);
        } else {
            LOGE("unable to load key file\n");
        }
    }

    apps_shutdown();

    return 0;
}
```

## verify.c

```c
/* gcc verify.c -o verify -lcrypto */

#include <stdio.h>
#include <stdlib.h>

#include <openssl/bio.h>
#include <openssl/err.h>
#include <openssl/evp.h>
#include <openssl/objects.h>
#include <openssl/pem.h>

#define _INPUT_FILE_    (0)

#undef BUFSIZE
#define BUFSIZE	(1024*8)

#define apps_startup() \
	do { \
        CRYPTO_malloc_init(); \
		ERR_load_crypto_strings(); \
        OpenSSL_add_all_algorithms(); \
    } while(0)
#define apps_shutdown() \
	do { \
		OBJ_cleanup(); \
        EVP_cleanup(); \
		CRYPTO_cleanup_all_ex_data(); \
        ERR_remove_thread_state(NULL); \
		ERR_free_strings(); \
    } while(0)

#define LOG_INIT() \
    if ((bio_err=BIO_new(BIO_s_file())) != NULL) \
        BIO_set_fp(bio_err,stderr,BIO_NOCLOSE|BIO_FP_TEXT);
#define LOGE(args...) \
    BIO_printf(bio_err, ##args);\
    ERR_print_errors(bio_err);

static BIO *bio_err;

static EVP_PKEY *load_pubkey(const char *file)
{
    BIO *key=NULL;
    EVP_PKEY *pkey=NULL;

    key=BIO_new(BIO_s_file());
    if (key != NULL) {
        if (BIO_read_filename(key,file) <= 0) {
            LOGE("Error opening %s\n", file);
        }
        pkey=PEM_read_bio_PUBKEY(key,NULL, NULL, NULL);
    } else {
        LOGE("BIO_new fail");
    }

    if (key != NULL) BIO_free(key);
    return(pkey);
}

static int do_verify(BIO *bmd, const char* infile,
    unsigned char *sigin, int siglen, const char* outfile)
{
    unsigned char *buf = NULL;
    if ((buf=(unsigned char *)OPENSSL_malloc(BUFSIZE)) == NULL) {
        LOGE("out of memory\n");
    } else {
#if _INPUT_FILE_
       BIO *in = BIO_new(BIO_s_file());
#else
       BIO *in = BIO_new_mem_buf((void*)infile, -1);
#endif
        if (in != NULL) {
            BIO *bp=BIO_push(bmd,in);
#if _INPUT_FILE_
            if (BIO_read_filename(in,infile) <= 0) {
                perror(infile);
            } else {
                int i = 1;
                while(i > 0) {
                    i=BIO_read(bp,(char *)buf,BUFSIZE);
                    if(i < 0) {
                        LOGE("Read Error in input file\n");
                        return 1;
                    }
                }
#else
            {
                BIO_read(bp, (char *)buf, BUFSIZE);
#endif

                if(sigin) {
                    EVP_MD_CTX *ctx;
                    BIO_get_md_ctx(bp, &ctx);
                    int r = EVP_DigestVerifyFinal(
                                            ctx, sigin, (unsigned int)siglen);

                    BIO *out = BIO_new_file(outfile, "wb");
                    if(out == NULL) {
                        LOGE("Error opening output file %s\n",
                                   outfile);
                    } else {
                        if(r > 0) {
                            BIO_printf(out, "Verified OK\n");
                        } else if(r == 0) {
                            BIO_printf(out, "Verification Failure\n");
                            return 1;
                        } else {
                            BIO_printf(out, "Error Verifying Data\n");
                            return 1;
                        }
                        BIO_free_all(out);
                    }
                }
            }
            BIO_free(in);
        }
        OPENSSL_cleanse(buf,BUFSIZE);
        OPENSSL_free(buf);
    }

    return 0;
}

int main(int argc, char **argv)
{
    const EVP_MD *md=NULL;
    BIO *bmd=NULL;
    EVP_PKEY *pubkey = NULL;
    unsigned char *sigbuf = NULL;
    int siglen = 0;

    const char *outfile = NULL;
    const char *keyfile = NULL;
    const char *infile = NULL;
    const char *sigfile = NULL;

    if ( argc < 5) {
        printf(
            "\nUsage:\n\t%s <pem> <sign> <in> <out>\n"
#if _INPUT_FILE_
            "Example:\n\t%s pubkey.pem foo.png.sig foo.png result.log\n\n",
#else
            "Example:\n\t%s pubkey.pem foo.sig \"abcdef\" result.log\n\n",
#endif
            argv[0], argv[0]);
        return -1;
    } else {
        keyfile = argv[1];
        sigfile = argv[2];
        infile  = argv[3];
        outfile = argv[4];
    }

    apps_startup();

    LOG_INIT();

    md = EVP_sha1();
    if (md == NULL) {
        LOGE("get sha1 digest fail\n");
    } else {

        bmd=BIO_new(BIO_f_md());

        if (bmd == NULL) {
            LOGE("BIO_new fail");
        } else {

            pubkey = load_pubkey(keyfile);
            if (pubkey != NULL) {
                EVP_MD_CTX *mctx = NULL;

                if (!BIO_get_md_ctx(bmd, &mctx)) {
                    LOGE("Error getting context\n");
                } else {
                    int r = EVP_DigestVerifyInit(
                                mctx, NULL, md, NULL, pubkey);
                    if (r == 0) {
                        LOGE("Error setting context\n");
                    } else {

                        siglen = EVP_PKEY_size(pubkey);
                        sigbuf = OPENSSL_malloc(siglen);
                        BIO *sigbio = BIO_new_file(sigfile, "rb");
                        if(sigbio == NULL) {
                            LOGE("Error opening signature file %s\n",
                                sigfile);
                        } else {
                            siglen = BIO_read(sigbio, sigbuf, siglen);
                            BIO_free(sigbio);
                            if(siglen <= 0) {
                                LOGE("Error reading signature file %s\n",
                                    sigfile);
                            } else {
                                do_verify(bmd, infile, 
                                            sigbuf, siglen, outfile);
                            }
                        }
                        if (sigbuf) OPENSSL_free(sigbuf);
                    }
                }
                (void)BIO_reset(bmd);
                EVP_PKEY_free(pubkey);
            } else {
                LOGE("unable to load key file\n");
            }
            BIO_free(bmd);
        }
    }

    apps_shutdown();

    return 0;
}
```
